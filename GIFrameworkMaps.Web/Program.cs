using Azure.Identity;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Web;
using GIFrameworkMaps.Web.Authorization;
using GIFrameworkMaps.Web.Filters;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Options;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Npgsql;
using OpenTelemetry.Trace;
using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using Yarp.ReverseProxy.Forwarder;

var builder = WebApplication.CreateBuilder(args);

ConfigureKeyVault(builder);

builder.Services.Configure<GIFrameworkMapsOptions>(builder.Configuration.GetSection(GIFrameworkMapsOptions.GIFrameworkMaps));
builder.Services.Configure<ApiKeyOptions>(builder.Configuration.GetSection(ApiKeyOptions.ApiKeys));

var options = builder.Configuration.GetSection(GIFrameworkMapsOptions.GIFrameworkMaps).Get<GIFrameworkMapsOptions>();

ConfigureServices(builder.Services, builder.Configuration, builder.Environment, options);

var app = builder.Build();
var forwarder = app.Services.GetService<IHttpForwarder>();

var startup = new Startup(options);
startup.Configure(app, app.Environment, forwarder);
await app.RunAsync();


void ConfigureKeyVault(WebApplicationBuilder builder)
{
    // Set up Azure Key Vault if a KeyVault name is provided in the configuration
    if (!string.IsNullOrEmpty(builder.Configuration.GetSection("KeyVault")["Name"]))
    {
        using var x509Store = new X509Store(StoreLocation.LocalMachine);
        x509Store.Open(OpenFlags.ReadOnly);

        var x509Certificate = x509Store.Certificates
            .Find(
                X509FindType.FindByThumbprint,
                builder.Configuration.GetSection("KeyVault").GetSection("AzureAd")["CertificateThumbprint"],
                validOnly: false)
            .OfType<X509Certificate2>()
            .Single();

        builder.Configuration.AddAzureKeyVault(
            new Uri($"https://{builder.Configuration.GetSection("KeyVault")["Name"]}.vault.azure.net/"),
            new ClientCertificateCredential(
                builder.Configuration.GetSection("KeyVault").GetSection("AzureAd")["DirectoryId"],
                builder.Configuration.GetSection("KeyVault").GetSection("AzureAd")["ApplicationId"],
                x509Certificate));
	}
}

void ConfigureServices(IServiceCollection services, IConfiguration configuration, IHostEnvironment environment, GIFrameworkMapsOptions options)
{
	// Configure forwarded headers options
	var networkingOptions = options.Networking;

	if (networkingOptions is not null && networkingOptions.UseForwardedHeadersMiddleware)
	{
		services.Configure<ForwardedHeadersOptions>(options =>
		{
			options.ForwardedHeaders = ForwardedHeaders.XForwardedProto;

			if (networkingOptions.KnownProxies is not null)
			{
				foreach (var proxy in networkingOptions.KnownProxies)
				{
					if (IPAddress.TryParse(proxy, out var ipAddress))
					{
						options.KnownProxies.Add(ipAddress);
					}
				}
			}
		});
	}


	// Suppress X-Frame-Options header if specified in the configuration
	if (options.SuppressXFrameOptions)
    {
        services.AddAntiforgery(x => x.SuppressXFrameOptionsHeader = true);
    }

    // Configure JSON options for controllers with views
    services.AddControllersWithViews().AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ConfigureForNodaTime(DateTimeZoneProviders.Tzdb);
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

    // Add other necessary services
    services.AddResponseCaching();
    services.AddSignalR();
    services.AddHttpClient();
    services.AddHttpContextAccessor();
	services.AddHealthChecks()
		.AddDbContextCheck<ApplicationDbContext>();

    var connectionString = configuration.GetConnectionString("GIFrameworkMaps");
    if (string.IsNullOrEmpty(connectionString))
    {
		throw new InvalidOperationException("Connection string was empty");
    }
	// Configure the database context
	services.AddDbContextPool<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(connectionString, x =>
        {
            x.MigrationsHistoryTable("__EFMigrationsHistory", "giframeworkmaps");
            x.UseNodaTime();
			x.MapEnum<AuthorizationType>("authorization_type");
		});
        options.EnableSensitiveDataLogging(environment.IsDevelopment());
        // Uncomment the following line for logging EF Core queries
        // options.LogTo(Console.WriteLine, minimumLevel: Microsoft.Extensions.Logging.LogLevel.Information);
    });

	// Configure authentication and authorization if Azure AD ClientId is provided
	if (!string.IsNullOrEmpty(configuration.GetSection("AzureAd")["ClientId"]))
	{

		var azureAdSection = configuration
				.GetSection("AzureAd");

		// Setup Authentication
		services
			.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
			.AddMicrosoftIdentityWebApp(azureAdSection);

		services.AddSingleton<ITicketStore, UserTicketStore>();
		services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
		   .Configure<ITicketStore>((o, ticketStore) => o.SessionStore = ticketStore);

		//Add resilient HTTP clients for OpenID Connect backchannel and other services that may be unreliable
		services.AddHttpClient(Options.DefaultName).AddStandardResilienceHandler();

		// OpenIdConnect backchannel resilience
		const string clientName = "OpenIdConnectResilient";
		services
			.AddHttpClient(clientName)
			.AddStandardResilienceHandler();

		services
			.AddOptions<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme)
			.Configure<IHttpClientFactory>((options, httpClientFactory) =>
			{
				options.Backchannel = httpClientFactory.CreateClient(clientName);
			});

		const string authRetryCookieName = "authretry-giframework-maps";

		services
		.AddOptions<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme)
		.Configure<IHttpClientFactory>((options, httpClientFactory) =>
		{
			options.GetClaimsFromUserInfoEndpoint = true;
			options.UseTokenLifetime = false;
			options.SaveTokens = true;
			// Authorization code flow with offline_access is required for Entra to issue a refresh token
			options.ResponseType = OpenIdConnectResponseType.Code;
			foreach (var scope in new[] { "openid", "profile", "offline_access" })
			{
				if (!options.Scope.Contains(scope))
				{
					options.Scope.Add(scope);
				}
			}
			options.Backchannel = httpClientFactory.CreateClient("OpenIdConnectResilient");
			// OpenID Connect adds
			options.SignedOutRedirectUri = "/account/signed-out";
			options.AccessDeniedPath = "/account/access-denied";
			options.Events ??= new OpenIdConnectEvents();
			var existingRedirectHandler = options.Events.OnRedirectToIdentityProvider;
			var existingOnRemoteFailureHandler = options.Events.OnRemoteFailure;
			var existingOnTokenValidatedHandler = options.Events.OnTokenValidated;

			// Workaround to fix intermittent AADSTS165000 on first login
			// where user is prompted to login with <appId>@domain.com instead of their actual email address.
			options.Events.OnRedirectToIdentityProvider = async context =>
			{
				context.ProtocolMessage.Prompt = "select_account";
				if (existingRedirectHandler != null)
					await existingRedirectHandler(context);
			};
			// Workaround for Entra External ID stale session errors on first login of the day.
			// When a user's Entra session expires overnight, the first authentication attempt can fail
			// with AADSTS50133 (session invalid due to expiry) or AADSTS165000 (session context missing).
			// This handler retries authentication once to obtain a fresh session. If the retry also fails
			// (indicating a genuine issue like a required password change), the user is redirected to an
			// error page to avoid an infinite redirect loop.
			options.Events.OnRemoteFailure = async context =>
			{
				if (context.Failure?.Message?.Contains("AADSTS50133", StringComparison.Ordinal) == true ||
					context.Failure?.Message?.Contains("AADSTS165000", StringComparison.Ordinal) == true)
				{

					var hasRetried = context.Request.Cookies.ContainsKey(authRetryCookieName);

					if (!hasRetried)
					{
						context.Response.Cookies.Append(authRetryCookieName, "1", new CookieOptions
						{
							HttpOnly = true,
							IsEssential = true,
							Secure = true,
							SameSite = SameSiteMode.Lax,
							MaxAge = TimeSpan.FromMinutes(5),
						});

						// SignIn defaults its redirectUri to the application's PathBase.
						var signInPath = context.Request.PathBase.Add("/sign-in");
						context.Response.Redirect(signInPath);
						context.HandleResponse();
					}
					else
					{
						context.Response.Cookies.Delete(authRetryCookieName);
						var loginFailedPath = context.Request.PathBase.Add("/account/login-failed");
						context.Response.Redirect(loginFailedPath);
						context.HandleResponse();
					}
				}
				else
				{

					if (existingOnRemoteFailureHandler != null)
						await existingOnRemoteFailureHandler(context);
				}
			};
			options.Events.OnTokenValidated = async context =>
			{
				context.Response.Cookies.Delete(authRetryCookieName);
				if (existingOnTokenValidatedHandler != null)
					await existingOnTokenValidatedHandler(context);
			};
		});

		services.AddRazorPages().AddMicrosoftIdentityUI();
	}
    else
    {
        services.AddRazorPages();
    }

    // Add custom authorization handlers and policies
    services.AddTransient<IAuthorizationHandler, HasAccessToVersionAuthorizationHandler>();
    services.AddTransient<IClaimsTransformation, ClaimsTransformer>();

    services.AddAuthorizationBuilder()
        .AddPolicy("CanAccessVersion", policy => policy.AddRequirements(new HasAccessToVersionRequirement()));

    // Add scoped repositories
    services.AddScoped<IApplicationDbContext, ApplicationDbContext>();
    services.AddScoped<ICommonRepository, CommonRepository>();
    services.AddScoped<ISearchRepository, SearchRepository>();
    services.AddScoped<IPrintRepository, PrintRepository>();
    services.AddScoped<IManagementRepository, ManagementRepository>();

    services.AddHttpForwarder();

	// Configure Azure Monitor (Application Insights) via OpenTelemetry
	services.AddOpenTelemetry()
		.WithTracing(tracing => tracing.AddProcessor(new UnwantedTelemetryFilter()))
		.UseAzureMonitor(options =>
		{
			options.ConnectionString = configuration["ApplicationInsights:ConnectionString"];
		});
}
