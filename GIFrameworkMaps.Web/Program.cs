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
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Npgsql;
using System;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using Yarp.ReverseProxy.Forwarder;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedProto;
});
builder.Services.AddControllersWithViews().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ConfigureForNodaTime(DateTimeZoneProviders.Tzdb);
});
builder.Services.AddResponseCaching();
builder.Services.AddSignalR();
builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();

builder.Services.AddDbContextPool<ApplicationDbContext>(
    options => {
        options.UseNpgsql("name=ConnectionStrings:GIFrameworkMaps", x => {
			x.MigrationsHistoryTable("__EFMigrationsHistory", "giframeworkmaps");
			x.UseNodaTime();
		});
        options.EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
		options.LogTo(Console.WriteLine, minimumLevel: Microsoft.Extensions.Logging.LogLevel.Information);
	});

builder.Services.AddAutoMapper(typeof(ApplicationDbContext));

/*Simple check to see if the Azure AD ClientId is available, which is required for user auth*/
if (!string.IsNullOrEmpty(builder.Configuration.GetSection("AzureAd")["ClientId"]))
{
    builder.Services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
		.AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"));

    builder.Services.AddRazorPages()
        .AddMicrosoftIdentityUI();

    builder.Services.Configure<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme, options =>
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
    builder.Services.AddRazorPages();
}

builder.Services.AddTransient<IAuthorizationHandler, HasAccessToVersionAuthorizationHandler>();
builder.Services.AddTransient<IClaimsTransformation, ClaimsTransformer>();

builder.Services.AddAuthorizationBuilder()
	.AddPolicy("CanAccessVersion", policy => policy.AddRequirements(new HasAccessToVersionRequirement()));
//builder.Services.AddAuthorization(options =>
//{
//	options.AddPolicy("CanAccessVersion", policy => policy.AddRequirements(new HasAccessToVersionRequirement()));
//});

builder.Services.AddScoped<IApplicationDbContext, ApplicationDbContext>();
builder.Services.AddScoped<ICommonRepository, CommonRepository>();
builder.Services.AddScoped<ISearchRepository, SearchRepository>();
builder.Services.AddScoped<IPrintRepository, PrintRepository>();
builder.Services.AddScoped<IManagementRepository, ManagementRepository>();

builder.Services.AddHttpForwarder();

//Setting this here ensures that the connection string is used from the secrets or KeyVault. 
//We have had examples where this has not worked as expected unless put here in this form.
ApplicationInsightsServiceOptions AppInsightOptions = new()
{
  ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"]
};
builder.Services.AddApplicationInsightsTelemetry(AppInsightOptions);
builder.Services.AddApplicationInsightsTelemetryProcessor<UnwantedTelemetryFilter>();

var app = builder.Build();
var forwarder = app.Services.GetService<IHttpForwarder>();

var startup = new Startup(builder.Configuration);
startup.Configure(app, app.Environment, forwarder);
await app.RunAsync();