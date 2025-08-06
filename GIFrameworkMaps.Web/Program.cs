using Azure.Identity;
using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Web;
using GIFrameworkMaps.Web.Authorization;
using GIFrameworkMaps.Web.Filters;
using Microsoft.ApplicationInsights.AspNetCore.Extensions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Npgsql;
using System;
using System.Configuration;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using Yarp.ReverseProxy.Forwarder;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using System.Net;

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
		// Add custom middleware to log unknown proxies
		services.AddSingleton<UnknownProxyLoggingMiddleware>();
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
		throw new ConfigurationErrorsException("Connection string was empty");
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

    services.AddAutoMapper(typeof(ApplicationDbContext));

	// Configure authentication and authorization if Azure AD ClientId is provided
	if (!string.IsNullOrEmpty(configuration.GetSection("AzureAd")["ClientId"]))
	{
		services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
			.AddMicrosoftIdentityWebApp(configuration.GetSection("AzureAd"), OpenIdConnectDefaults.AuthenticationScheme, CookieAuthenticationDefaults.AuthenticationScheme, true);

		services.AddSingleton<ITicketStore, UserTicketStore>();
		services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
		   .Configure<ITicketStore>((o, ticketStore) => o.SessionStore = ticketStore);

		services.Configure<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme, options =>
		{
			options.ClientId = configuration.GetSection("AzureAd")["ClientId"];
			options.ClientSecret = configuration.GetSection("AzureAd")["ClientSecret"];
			options.Authority = configuration.GetSection("AzureAd")["Authority"] + "v2.0/";

			options.UsePkce = true;
			options.ResponseType = "code";
			options.ResponseMode = "form_post";

			options.Scope.Clear();
			options.Scope.Add("openid");
			options.Scope.Add("offline_access");
			options.Scope.Add(options.ClientId);

			options.GetClaimsFromUserInfoEndpoint = true;
			options.UseTokenLifetime = false;
			options.SaveTokens = true;

			options.Events = new OpenIdConnectEvents()
			{
				//OnRedirectToIdentityProvider =
				//{
				//	//Use this to insert a login hint if required
				//}
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

    // Configure Application Insights
    ApplicationInsightsServiceOptions appInsightOptions = new()
    {
        ConnectionString = configuration["ApplicationInsights:ConnectionString"]
    };
    services.AddApplicationInsightsTelemetry(appInsightOptions);
    services.AddApplicationInsightsTelemetryProcessor<UnwantedTelemetryFilter>();
}
