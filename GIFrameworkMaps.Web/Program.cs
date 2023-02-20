using GIFrameworkMaps.Web;
using Microsoft.AspNetCore.Builder;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography.X509Certificates;
using System.Linq;
using System;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Identity.Web.UI;
using Microsoft.Identity.Web;
using GIFrameworkMaps.Data;
using Microsoft.EntityFrameworkCore;
using GIFrameworkMaps.Web.Authorization;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Yarp.ReverseProxy.Forwarder;
using Microsoft.Extensions.Logging.ApplicationInsights;
using Microsoft.ApplicationInsights.AspNetCore.Extensions;

var builder = WebApplication.CreateBuilder(args);

if (!String.IsNullOrEmpty(builder.Configuration.GetSection("KeyVault")["Name"]))
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
//var startup = new Startup(builder.Configuration);

//startup.ConfigureServices(builder.Services);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedProto;
});
builder.Services.AddControllersWithViews();
builder.Services.AddResponseCaching();
builder.Services.AddSignalR();
builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();

builder.Services.AddDbContext<ApplicationDbContext>(
    options => options.UseNpgsql("name=ConnectionStrings:GIFrameworkMaps", x => x.MigrationsHistoryTable("__EFMigrationsHistory", "giframeworkmaps")));

/*TODO Not sure about this line. Is this correct?
 Seems to be the only way to get AutoMapper set up in the Data Access project*/
builder.Services.AddAutoMapper(typeof(GIFrameworkMaps.Data.ApplicationDbContext));

/*Simple check to see if the Azure AD ClientId is available, which is required for user auth*/
if (!String.IsNullOrEmpty(builder.Configuration.GetSection("AzureAd")["ClientId"]))
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

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanAccessVersion", policy => policy.AddRequirements(new HasAccessToVersionRequirement()));
});

builder.Services.AddScoped<IApplicationDbContext, ApplicationDbContext>();
builder.Services.AddScoped<ICommonRepository, CommonRepository>();
builder.Services.AddScoped<ISearchRepository, SearchRepository>();
builder.Services.AddScoped<IPrintRepository, PrintRepository>();
builder.Services.AddScoped<IManagementRepository, ManagementRepository>();

builder.Services.AddHttpForwarder();

//Setting this here ensures that the connection string is used from the secrets or KeyVault. 
//We have had examples where this has not worked as expected unless put here in this form.
ApplicationInsightsServiceOptions AppInsightOptions = new ApplicationInsightsServiceOptions();
AppInsightOptions.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
builder.Services.AddApplicationInsightsTelemetry(AppInsightOptions);


var app = builder.Build();
var forwarder = app.Services.GetService<IHttpForwarder>();

var startup = new Startup(builder.Configuration);
startup.Configure(app, app.Environment, forwarder);
app.Run();