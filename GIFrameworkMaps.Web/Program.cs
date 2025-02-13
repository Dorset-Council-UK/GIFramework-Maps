using Azure.Identity;
using GIFrameworkMaps.Data;
using GIFrameworkMaps.Web;
using GIFrameworkMaps.Web.Authorization;
using GIFrameworkMaps.Web.Filters;
using Microsoft.ApplicationInsights.AspNetCore.Extensions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
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
	services.Configure<ForwardedHeadersOptions>(options =>
	{
		options.ForwardedHeaders = ForwardedHeaders.XForwardedProto;
	});

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
            .AddMicrosoftIdentityWebApp(configuration.GetSection("AzureAd"));

        services.AddRazorPages().AddMicrosoftIdentityUI();

        services.Configure<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme, options =>
        {
            //options.ResponseType = OpenIdConnectResponseType.CodeToken;
            options.UsePkce = true;
            options.SaveTokens = true;
            options.Scope.Add("openid");
            options.Scope.Add(options.ClientId);
        });
    }
    else
    {
        services.AddRazorPages();
    }

    // Add custom authorization handlers and policies
    builder.Services.AddTransient<IAuthorizationHandler, HasAccessToVersionAuthorizationHandler>();
    builder.Services.AddTransient<IClaimsTransformation, ClaimsTransformer>();

    builder.Services.AddAuthorizationBuilder()
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
