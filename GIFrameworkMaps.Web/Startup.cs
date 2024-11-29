using GIFrameworkMaps.Data;
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
using NodaTime;
using GIFrameworkMaps.Web.Options;

namespace GIFrameworkMaps.Web
{
	public class Startup(GIFrameworkMapsOptions options)
	{
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

            if (options.UseHttpsRedirection)
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
				   name: "ManagementInterface-Basemap",
				   pattern: "Management/Basemap/{action=Index}/{id?}",
				   defaults: new { controller = "ManagementBasemap", action = "Index" });

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

            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            if (!context.Versions.Any())
            {
                var ukBound = new Bound
                {
                    Name = "UK",
                    Description = "The extent of the United Kingdom plus a little extra to the east and a little less from the northern isles",
                    BottomLeftX = -1226886,
                    BottomLeftY = 6301670,
                    TopRightX = 265865,
                    TopRightY = 8405431
                };
                var globalBound = new Bound
                {
                    Name = "Global",
                    Description = "The extent of the whole world",
                    BottomLeftX = -20037508,
                    BottomLeftY = -20037508,
                    TopRightX = 20037508,
                    TopRightY = 20037508
                };
                var theme = new Theme
                {
                    Name = "Default",
                    Description = "The default style",
                    PrimaryColour = "05476d",
                    LogoURL = "https://gistaticprod.blob.core.windows.net/giframeworkmaps/giframework-maps-icon.svg"
                };
				var ukProjection = new Projection
				{
					EPSGCode = 27700,
					Name = "British National Grid",
					Description = "Ordnance Survey National Grid reference system (OSGB), also known as British National Grid (BNG). Standard grid for mapping in England, Wales and Scotland",
					Proj4Definition = "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs",
					MinBoundX = (decimal)-9.00,
					MinBoundY = (decimal)49.75,
					MaxBoundX = (decimal)2.01,
					MaxBoundY = (decimal)61.01,
					DefaultRenderedDecimalPlaces = 0,
				};
				var versionProjections = new VersionProjection
				{
					ProjectionId = ukProjection.EPSGCode,
					IsDefaultMapProjection = true,
					IsDefaultViewProjection = true,
					Projection = ukProjection
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
					Theme = theme,
				};
				version.VersionProjections.Add(versionProjections);
				context.Versions.Add(version);

				if (!context.Layers.Any())
				{
					SeedDatabaseWithDefaultLayers(ref context, ref version);
				}

				if (!context.SearchDefinitions.Any())
                {
                    SeedDatabaseWithSearchDefinitions(ref context, ref version);
                }

				if (!context.WelcomeMessages.Any())
				{
					var defaultWelcomeMessage = new WelcomeMessage
					{
						Name = "Default Welcome Message",
						Title = "Welcome to GIFrameworkMaps",
						Content = "<p>GIFrameworkMaps is an open source .NET based web map built with OpenLayers and Bootstrap.</p><p>In this default version, we've added a few things to help you get started. Check out the buttons on the right to adjust your basemap, turn on one of our example layers or create a PDF map ready to print.</p><h5>We need you!</h5><p><a href=\"https://github.com/Dorset-Council-UK/GIFramework-Maps\" target=\"blank\">Find us on GitHub</a> for the latest updates and find out how you can contribute.</p>",
						UpdateDate = LocalDateTime.FromDateTime(DateTime.Now),
						DismissOnButtonOnly = false,
					};
					version.WelcomeMessage = defaultWelcomeMessage;
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
					var osmUrlOption = new LayerSourceOption()
					{
						Name = "url",
						Value = "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					};
					var osmProjectionOption = new LayerSourceOption()
					{
						Name = "projection",
						Value = "EPSG:3857"
					};
					var osmLayerSource = new LayerSource
                    {
                        Name = "OpenStreetMap",
                        Description = "OpenStreetMap is a free map of the world created and run by volunteers. Note this layer should NOT be used for high usage workloads as it uses the free OpenStreetMap tile server.",
                        Attribution = new Attribution { Name = "OpenStreetMap", AttributionHTML = "© <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">OpenStreetMap</a> contributors, CC-BY-SA" },
                        LayerSourceType = new LayerSourceType { Name = "XYZ", Description = "Layer sources using the XYZ tile scheme. Similar to TMS." },
                        LayerSourceOptions = [ osmUrlOption, osmProjectionOption ]
                    };

                    var osmLayer = new Basemap { LayerSource = osmLayerSource, Name = "OpenStreetMap", Bound = globalBound, MinZoom = 2, MaxZoom = 18 };
                    version.VersionBasemaps = [new() { Basemap = osmLayer, IsDefault = true, DefaultOpacity = 100, DefaultSaturation = 100 }];
                }
                context.SaveChanges();
            }
        }

		private static void SeedDatabaseWithDefaultLayers (ref ApplicationDbContext context, ref Data.Models.Version version) 
		{
			// Layer source options for each of the default layers
			// UK Counties
			var countiesUrlOption = new List<LayerSourceOption>
			{
				new() {
					Name = "url",
					Value = "https://gi.dorsetcouncil.gov.uk/geoserver/boundaryline/wms?SERVICE=WMS&",
				},
				new() {
					Name = "params",
					Value = "{\r\n\"LAYERS\":\"uk_county\",\r\n\"FORMAT\":\"image/png\",\r\n\r\n\"VERSION\": \"1.1.0\"\r\n}",
				},
			};
			// UK Educational Establishments
			var educationUrlOption = new List<LayerSourceOption>
			{
				new() {
					Name = "url",
					Value = "https://gi.dorsetcouncil.gov.uk/geoserver/schools/wms",
				},
				new() {
					Name = "params",
					Value = "{\r\n\"LAYERS\":\"gov_uk_schools\",\r\n\"FORMAT\":\"image/png\",\r\n\r\n\"VERSION\": \"1.1.0\"\r\n}",
				},
			};
			// World Heritage Sites
			var worldHeritageUrlOption = new List<LayerSourceOption>
			{
				new() {
					Name = "url",
					Value = "https://gi.dorsetcouncil.gov.uk/geoserver/ORA_historic_england/wms",
				},
				new() {
					Name = "params",
					Value = "{\"LAYERS\": \"HIST_ENG_WORLD_HERITAGE_SITE\",\r\n\"FORMAT\": \"image/png\",\r\n\"TILED\":\"true\"\r\n}",
				},
			};
			// National Nature Reserves
			var natureReservesUrlOption = new List<LayerSourceOption>
			{
				new() {
					Name = "url",
					Value = "https://gi.dorsetcouncil.gov.uk/geoserver/ORA_natural_england/wms",
				},
				new() {
					Name = "params",
					Value = "\t{\"LAYERS\": \"NATENG_NNR\",\r\n\"FORMAT\": \"image/png\",\r\n\"TILED\":\"true\"\r\n}",
				},
			};

			// Layer sources for each of the default layers
			var countiesLayerSource = new LayerSource
			{
				Name = "UK Counties",
				Description = "UK wide county boundaries from OS Boundary-Line.",
				Attribution = new Attribution { Name = "OS Open Data", AttributionHTML = "Contains OS data © Crown copyright and database rights {{CURRENT_YEAR}}" },
				LayerSourceType = new LayerSourceType { Name = "TileWMS", Description = "Layer sources using the TileWMS layer type" },
				LayerSourceOptions = countiesUrlOption,
			};
			var educationLayerSource = new LayerSource
			{
				Name = "UK Educational Establishments",
				Description = "UK Schools dataset as downloaded from https://data.gov.uk",
				Attribution = new Attribution { Name = "Open Government Licence OGL", AttributionHTML = "Use of this data is subject to the <a href=\"https://www.nationalarchives.gov.uk/doc/open-government-licence\" target=\"_blank\">Open Government Licence</a>" },
				LayerSourceType = new LayerSourceType { Name = "TileWMS", Description = "Layer sources using the TileWMS layer type" },
				LayerSourceOptions = educationUrlOption,
			};
			var worldHeritageLayerSource = new LayerSource
			{
				Name = "World Heritage Site",
				Description = "World Heritage Sites are sites, places, monuments of buildings of Outstanding Universal Value to all humanity - today and in future generations. The World Heritage List includes a wide variety of exceptional cultural and natural sites, such as landscapes, cities, monuments, technological sites and modern buildings",
				Attribution = new Attribution { Name = "Historic England", AttributionHTML = "© <a href=\"http://www.historicengland.org.uk\" target=\"blank\">Historic England</a> {{CURRENT_YEAR}}. Contains Ordnance Survey data © Crown copyright and database right {{CURRENT_YEAR}}. The most publicly available up to date Historic England GIS Data can be obtained from <a href=\"http://www.historicengland.org.uk\" target=\"blank\">http://www.historicengland.org.uk</a>." },
				LayerSourceType = new LayerSourceType { Name = "TileWMS", Description = "Layer sources using the TileWMS layer type" },
				LayerSourceOptions = worldHeritageUrlOption,
			};
			var natureReservesLayerSource = new LayerSource
			{
				Name = "National Nature Reserves",
				Description = "National Nature Reserves",
				Attribution = new Attribution { Name = "Open Government Licence OGL", AttributionHTML = "Use of this data is subject to the <a href=\"https://www.nationalarchives.gov.uk/doc/open-government-licence\" target=\"_blank\">Open Government Licence</a>" },
				LayerSourceType = new LayerSourceType { Name = "TileWMS", Description = "Layer sources using the TileWMS layer type" },
				LayerSourceOptions = natureReservesUrlOption,
			};

			var defaultLayers = new List<Layer>
			{
				new() {
					LayerSource = countiesLayerSource,
					Name = "UK Counties",
					ZIndex = -10,
					Queryable = true,
					InfoListTitleTemplate = "{{name}}",
					InfoTemplate = "<h1>{{name}}</h1>\r\n<p><strong>Area description:</strong> {{area_description}}</p>\r\n<p><strong>Hectares:</strong> {{hectares}}</p>\r\n<p><strong>Non inland area:</strong> {{non_inland_area}}m2</p>\r\n",
					Filterable = true,
				},
				new() {
					LayerSource = educationLayerSource,
					Name = "UK Educational Establishments",
					Queryable = true,
					InfoListTitleTemplate = "{{establishment_name}} ({{type_of_establishment}})",
					InfoTemplate = "<h1>{{establishment_name}}</h1>\r\n<p><strong>Type: </strong>{{type_of_establishment}}</p>\r\n<p><strong>Phase of Education: </strong>{{phase_of_education}}</p>\r\n{% if school_capacity %}\r\n<p><strong>Capacity: </strong>{{school_capacity}}</p>\r\n{% endif %}\r\n{% if number_of_pupils %}\r\n<p><strong>No. Pupils: </strong>{{number_of_pupils}} ({{number_of_boys}} boys, {{number_of_girls}} girls)</p>\r\n{% endif %}\r\n<p><strong>{{head_preferred_job_title if head_preferred_job_title else \"Head/Principal/Manager\"}}: </strong>{{head_title}} {{head_first_name}} {{head_last_name}}</p>\r\n{% if trusts %}\r\n<p><strong>Trusts: </strong>{{trusts}}</p>\r\n{% endif %}\r\n{% if ofsted_last_insp %}\r\n<p><strong>Last Ofsted Inspection: </strong>{{ofsted_last_insp | date}} - {{ofsted_rating}}</p>\r\n{% endif %}\r\n{% if school_website %}\r\n<p><a href=\"{{school_website}}\" target=\"_blank\">{{school_website}}</a></p>\r\n{% endif %}\r\n{% if telephone_num %}\r\n<p><strong>Tel: </strong>{{telephone_num}}</p>\r\n{% endif %}",
					Filterable = true,
				},
				new() {
					LayerSource = worldHeritageLayerSource,
					Name = "World Heritage Site",
					MaxZoom = 25,
					Queryable = true,
					InfoListTitleTemplate = "{{NAME}}",
					InfoTemplate = "<h1>World Heritage Site</h1>\r\n<p><strong>Name: </strong>{{NAME}}</p>\r\n<p><strong>Inscription Date: </strong>{{INSCRDATE | date}}</p>\r\n<p><strong>List Entry ID: </strong>{{LISTENTRY}}</p>\r\n<p><a href=\"https://historicengland.org.uk/listing/the-list/list-entry/{{LISTENTRY}}\" target=\"_blank\">Learn more about this site on the Historic England website</a></p>",
					Filterable = true,
				},
				new() {
					LayerSource = natureReservesLayerSource,
					Name = "National Nature Reserves",
					MaxZoom = 50,
					Queryable = true,
					InfoListTitleTemplate = "{{NNR_NAME}}",
					InfoTemplate = "<h1>{{NNR_NAME}}</h1>\r\n<p><strong>Status:</strong> {{STATUS}}</p>\r\n<p><strong>Details:</strong> {{DETAILS}}</p>\r\n<a href=\"{{URL}}\" target=\"_blank\" title=\"\">Click here for more details on this layer</a>",
					Filterable = true,
				}
			};

			var defaultLayerCategory = new Category
			{
				Name = "Default Layers",
				Description = "Default layers for examples of use",
				Order = 1,
			};
			context.Categories.Add(defaultLayerCategory);
			context.SaveChanges();

			foreach (Layer layer in defaultLayers)
			{
				// Create and save each default layer
				context.Layers.Add(layer);
				context.SaveChanges();
				// Add these layers to a CategoryLayer for each layer (tells the category which layers to include)
				var categoryLayer = new CategoryLayer { LayerId = layer.Id, CategoryId = defaultLayerCategory.Id };
				context.CategoryLayers.Add(categoryLayer);
				context.SaveChanges();
			};

			var defaultVersionCategory = new VersionCategory
			{
				VersionId = version.Id,
				CategoryId = defaultLayerCategory.Id,
				Category = defaultLayerCategory,
			};
			version.VersionCategories.Add(defaultVersionCategory);
			context.SaveChanges();
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
        private class CustomTransformer(IApplicationBuilder app) : HttpTransformer
        {
            readonly IApplicationBuilder _app = app;

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

                    if(allowedHosts.FirstOrDefault(h => h.Host.Equals(requestUri.Host, StringComparison.CurrentCultureIgnoreCase)) == null){
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
