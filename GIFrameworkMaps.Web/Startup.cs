using GIFrameworkMaps.Data;
//using GIFrameworkMaps.Web.Authorization;
//using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Collections.Generic;
using System.Linq;
using GIFrameworkMaps.Web.Hubs;
using System.Net.Http;
using Yarp.ReverseProxy.Forwarder;
using System.Net;
using System.Diagnostics;
using System;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using Yarp.ReverseProxy.Transforms;
using GIFrameworkMaps.Data.Models;
using System.Threading;

namespace GIFrameworkMaps.Web
{
	public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(
            IApplicationBuilder app, 
            IWebHostEnvironment env, 
            IHttpForwarder forwarder)
        {

            app.UseForwardedHeaders();
            if (env.IsDevelopment())
            {
                SeedDatabase(app);
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }
            bool useHttpsRedirection = true;

            if (bool.TryParse(Configuration["GIFrameworkMaps:UseHttpsRedirection"], out bool config_useHttpsRedirection))
            {
                useHttpsRedirection = config_useHttpsRedirection;
            };

            if (useHttpsRedirection)
            {
                app.UseHttpsRedirection();
            }

            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseResponseCaching();

            /*YARP setup. Copied from https://github.com/microsoft/reverse-proxy/blob/release/latest/samples/ReverseProxy.Direct.Sample/Startup.cs*/
            // Configure our own HttpMessageInvoker for outbound calls for proxy operations
            var httpClient = new HttpMessageInvoker(new SocketsHttpHandler()
            {
                UseProxy = false,
                AllowAutoRedirect = false,
                AutomaticDecompression = DecompressionMethods.None,
                UseCookies = false,
                ActivityHeadersPropagator = new ReverseProxyPropagator(DistributedContextPropagator.Current)

            });

            // Setup our own request transform class
            

            var transformer = new CustomTransformer(app); // or HttpTransformer.Default;
            var requestOptions = new ForwarderRequestConfig { ActivityTimeout = TimeSpan.FromSeconds(100) };

            app.UseEndpoints(endpoints =>
            {
                string default_version_slug = "general";
                endpoints.MapControllerRoute(
                    name: "ManagementInterface",
                    pattern: "Management/{action}/{id?}",
                    defaults: new { controller = "Management", action = "Index" });

                endpoints.MapControllerRoute(
                    name: "ManagementInterface-System",
                    pattern: "Management/System/{action=Index}/{id?}",
                    defaults: new {controller="ManagementSystem",action="Index"});

                endpoints.MapControllerRoute(
                    name: "ManagementInterface-Attribution",
                    pattern: "Management/Attribution/{action=Index}/{id?}",
                    defaults: new { controller = "ManagementAttribution", action = "Index" });

                endpoints.MapControllerRoute(
                    name: "ManagementInterface-Version",
                    pattern: "Management/Version/{action=Index}/{id?}",
                    defaults: new { controller = "ManagementVersion", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-Bound",
                   pattern: "Management/Bound/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementBound", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-Theme",
                   pattern: "Management/Theme/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementTheme", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-WelcomeMessage",
                   pattern: "Management/WelcomeMessage/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementWelcomeMessage", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-WebLayerServiceDefinition",
                   pattern: "Management/System/WebLayerServiceDefinition/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementWebLayerServiceDefinition", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-SearchDefinition",
                   pattern: "Management/SearchDefinition/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementSearchDefinition", action = "Index" });

                endpoints.MapControllerRoute(
                    name: "ManagementInterface-Tour",
                    pattern: "Management/Tour/{action=Index}/{id?}",
                    defaults: new { controller = "ManagementTour", action = "Index" });

                endpoints.MapControllerRoute(
                    name: "ManagementInterface-TourStep",
                    pattern: "Management/TourStep/{action=Index}/{id?}",
                    defaults: new { controller = "ManagementTourStep", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-Layer",
                   pattern: "Management/Layer/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementLayer", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-LayerWizard",
                   pattern: "Management/LayerWizard/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementLayerWizard", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-LayerSource",
                   pattern: "Management/LayerSource/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementLayerSource", action = "Index" });

                endpoints.MapControllerRoute(
                   name: "ManagementInterface-LayerCategory",
                   pattern: "Management/LayerCategory/{action=Index}/{id?}",
                   defaults: new { controller = "ManagementLayerCategory", action = "Index" });

                endpoints.MapControllerRoute(
                    name: "ManagementInterface-User",
                    pattern: "Management/User/{action=Index}/{id?}",
                    defaults: new { controller = "ManagementUser", action = "Index" });

				endpoints.MapControllerRoute(
					name: "ManagementInterface-System-Projection",
					pattern: "Management/System/Projection/{action=Index}/{id?}",
					defaults: new { controller = "ManagementProjection", action = "Index" });

				endpoints.MapControllerRoute("General_Map_Redirect", "Map", new { controller = "Map", action = "RedirectToGeneral" });
                
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
                
                endpoints.MapControllerRoute("UserShortLink","u/{id}",new { controller = "Map", action = "UserShortLink" });

                endpoints.MapControllerRoute("Default_Slug", "{slug1}/{slug2?}/{slug3?}", new { controller = "Map", action = "Index", slug1 = default_version_slug });
                
                endpoints.Map("/proxy", async httpContext =>
                {
                    var queryContext = new QueryTransformContext(httpContext.Request);
                    if (queryContext.Collection.TryGetValue("url", out Microsoft.Extensions.Primitives.StringValues url))
                    {
                        var error = await forwarder.SendAsync(httpContext, url, httpClient, requestOptions, transformer);
                        // Check if the proxy operation was successful
                        if (error != ForwarderError.None)
                        {
                            var errorFeature = httpContext.Features.Get<IForwarderErrorFeature>();
                            var exception = errorFeature.Exception;
                        }
                    }
                });

                endpoints.MapHub<BroadcastHub>("/broadcasthub");
                endpoints.MapRazorPages();
            });
        }

        private static void SeedDatabase(IApplicationBuilder app)
        {
            using var scope = app.ApplicationServices.GetService<IServiceScopeFactory>().CreateScope();
            //scope.ServiceProvider.GetRequiredService<IdentityServer4.EntityFramework.DbContexts.PersistedGrantDbContext>().Database.Migrate();
            //scope.ServiceProvider.GetRequiredService<IdentityServer4.EntityFramework.DbContexts.ConfigurationDbContext>().Database.Migrate();
            //scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.Migrate();

            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            if (!context.Versions.Any())
            {

                var ukBound = new Data.Models.Bound
                {
                    Name = "UK",
                    Description = "The extent of the United Kingdom plus a little extra to the east and a little less from the northern isles",
                    BottomLeftX = -1226886,
                    BottomLeftY = 6301670,
                    TopRightX = 265865,
                    TopRightY = 8405431
                };
                var globalBound = new Data.Models.Bound
                {
                    Name = "Global",
                    Description = "The extent of the whole world",
                    BottomLeftX = -20037508,
                    BottomLeftY = -20037508,
                    TopRightX = 20037508,
                    TopRightY = 20037508
                };
                var theme = new Data.Models.Theme
                {
                    Name = "Default",
                    Description = "The default style",
                    PrimaryColour = "05476d",
                    LogoURL = "https://gistaticprod.blob.core.windows.net/giframeworkmaps/giframework-maps-icon.svg"
                };

                var version = new Data.Models.Version
                {
                    Name = "General",
                    Description = "The general version",
                    RequireLogin = false,
                    ShowLogin = true,
                    Enabled = true,
                    Slug = "general",
                    Bound = ukBound,
                    Theme = theme
                };

                context.Versions.Add(version);

                if (!context.SearchDefinitions.Any())
                {
                    SeedDatabaseWithSearchDefinitions(ref context, ref version);

                }

                var printConfig = new Data.Models.Print.PrintConfiguration
                {
                    Name = "Default",
                    LogoURL = "https://gistaticprod.blob.core.windows.net/giframeworkmaps/print-logos/gifw-logo-colour-with-clearzone.png"
                };
                context.VersionPrintConfigurations.Add(new Data.Models.VersionPrintConfiguration
                {
                    Version = version,
                    PrintConfiguration = printConfig
                });

                if (!context.Basemaps.Any())
                {
                    var osmLayerSource = new Data.Models.LayerSource
                    {
                        Name = "OpenStreetMap",
                        Description = "OpenStreetMap is a free map of the world created and run by volunteers. Note this layer should NOT be used for high usage workloads as it uses the free OpenStreetMap tile server.",
                        Attribution = new Data.Models.Attribution { Name = "OpenStreetMap", AttributionHTML = "© <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">OpenStreetMap</a> contributors, CC-BY-SA" },
                        LayerSourceType = new Data.Models.LayerSourceType { Name = "XYZ", Description = "Layer sources using the XYZ tile scheme. Similar to TMS." },
                        LayerSourceOptions = new List<Data.Models.LayerSourceOption> { new() { Name = "url", Value = "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png" } }
                    };

                    var osmLayer = new Data.Models.Basemap { LayerSource = osmLayerSource, Name = "OpenStreetMap", Bound = globalBound, MinZoom = 2, MaxZoom = 18 };
                    version.VersionBasemaps = new List<Data.Models.VersionBasemap>() { new() { Basemap = osmLayer, IsDefault = true, DefaultOpacity = 100, DefaultSaturation = 100 } };

                }
                context.SaveChanges();
            }
        }

        private static void SeedDatabaseWithSearchDefinitions(ref ApplicationDbContext context, ref Data.Models.Version version)
        {
            var searchDefs = new List<Data.Models.Search.SearchDefinition>
            {
                new Data.Models.Search.LocalSearchDefinition
                {
                    Name = "Coordinates - BNG 12 Figure",
                    Title = "British National Grid Coordinates",
                    MaxResults = 1,
                    EPSG = 27700,
                    SupressGeom = false,
                    ValidationRegex = @"^(\d{1,3}),(\d{3})(\.\d+)?(\s+)(\d{1},)?(\d{1,3}),(\d{3})(\.\d+)?$|^(\d{1,6})(\.\d+)?(\s+|,\s*)(\d{1,7})(\.\d+)?$",
                    LocalSearchName = "BNG12Figure",
                    ZoomLevel = 18
                },
                new Data.Models.Search.LocalSearchDefinition
                {
                    Name = "Coordinates - BNG Alphanumeric",
                    Title = "British National Grid Coordinates",
                    MaxResults = 1,
                    EPSG = 27700,
                    SupressGeom = false,
                    ValidationRegex = @"^([STNHOstnho][A-Za-z]\s?)(\d{5}\s?\d{5}|\d{4}\s?\d{4}|\d{3}\s?\d{3}|\d{2}\s?\d{2}|\d{1}\s?\d{1})$",
                    LocalSearchName = "BNGAlphaNumeric",
                    ZoomLevel = 18
                },
                new Data.Models.Search.LocalSearchDefinition
                {
                    Name = "Coordinates - Latitude/Longitude Decimal",
                    Title = "Latitude/Longitude",
                    MaxResults = 1,
                    EPSG = 4326,
                    SupressGeom = false,
                    ValidationRegex = @"^(-?\d+(\.\d+)?)\s*,*\s*(-?\d+(\.\d+)?)$",
                    LocalSearchName = "LatLonDecimal",
                    ZoomLevel = 18
                },
                new Data.Models.Search.LocalSearchDefinition
                {
                    Name = "Coordinates - Lat/Lon Degrees Minutes Seconds",
                    Title = "Latitude/Longitude",
                    MaxResults = 1,
                    EPSG = 4326,
                    SupressGeom = false,
                    ValidationRegex = "^([0-8]?[0-9]|90)°?(\\s[0-5]?[0-9]['′]?)?(\\s[0-5]?[0-9](.[0-9]+)?[\"″]?)?\\s?([NSns])\\s+([0-8]?[0-9]|90)°?(\\s[0-5]?[0-9]['′]?)?(\\s[0-5]?[0-9](.[0-9]+)?[\"″]?)?\\s?([EWew])$",
                    LocalSearchName = "LatLonDMS",
                    ZoomLevel = 18
                },
                new Data.Models.Search.LocalSearchDefinition
                {
                    Name = "Plus Codes",
                    Title = "Plus Code",
                    AttributionHtml = "<a href=\"https://maps.google.com/pluscodes/learn/\" target=\"_blank\" rel=\"noopener\" title=\"Learn more about Plus Codes\"><img src=\"https://gistaticprod.blob.core.windows.net/giframeworkmaps/third-party-logos/pluscodes_lockup.png\" width=\"100\"/></a>",
                    MaxResults = 1,
                    EPSG = 4326,
                    SupressGeom = false,
                    LocalSearchName = "PlusCode",
                    ZoomLevel = 18
                },
                new Data.Models.Search.LocalSearchDefinition
                {
                    Name = "Coordinates - Spherical Mercator",
                    Title = "Spherical Mercator Coordinate",
                    MaxResults = 1,
                    EPSG = 3857,
                    SupressGeom = false,
                    LocalSearchName = "SphericalMercator",
                    ZoomLevel = 18
                }
            };
            int order = 10;
            foreach(Data.Models.Search.SearchDefinition def in searchDefs)
            {
                context.SearchDefinitions.Add(def);
                context.VersionSearchDefinitions.Add(new Data.Models.VersionSearchDefinition
                {
                    Version = version,
                    SearchDefinition = def,
                    Enabled = true,
                    Order = order,
                    StopIfFound = true
                });
                order += 10;
            }
        }
        private class CustomTransformer : HttpTransformer
        {
            readonly IApplicationBuilder _app;
            public CustomTransformer(IApplicationBuilder app)
            {
                _app = app;
            }
            public override async ValueTask TransformRequestAsync(
                HttpContext httpContext,
                HttpRequestMessage proxyRequest, 
                string destinationPrefix,
                CancellationToken cancellationToken)
            {
                // Copy all request headers
                await base.TransformRequestAsync(httpContext, proxyRequest, destinationPrefix, cancellationToken);

                // Customize the query string:
                var queryContext = new QueryTransformContext(httpContext.Request);

                var url = queryContext.Collection["url"];
                if (!string.IsNullOrEmpty(url))
                {
                    List<ProxyAllowedHost> allowedHosts;
                    /*TODO - Injecting the common repository in this way seems a little suspect but does work*/
                    using (var scope = _app.ApplicationServices.CreateScope())
                    {
                        var repo = scope.ServiceProvider.GetRequiredService<ICommonRepository>();
                        allowedHosts = await repo.GetProxyAllowedHostsAsync();
                    }
                    string decodedUrl = System.Uri.UnescapeDataString(url);
                    Uri requestUri = new(decodedUrl);

                    if(allowedHosts.FirstOrDefault(h => h.Host.ToLower() == requestUri.Host.ToLower()) == null){
                        return;
                    }

                    proxyRequest.RequestUri = requestUri;
                    //Transform request headers
                    proxyRequest.Headers.Host = null;
                    proxyRequest.Headers.Remove("Origin");
                    proxyRequest.Headers.Remove("Cookie");
                }
                else
                {
                    //drop the request?
                }
            }
        }
    }
}
