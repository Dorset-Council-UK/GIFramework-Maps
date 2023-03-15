using AspNetCore;
using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels;
using GIFrameworkMaps.Web.Models.API;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Svg;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers
{
    public class APIController : Controller
    {
        //dependancy injection
        private readonly ILogger<APIController> _logger;
        private readonly ICommonRepository _repository;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly IConfiguration _configuration;
        private readonly IAuthorizationService _authorization;

        public APIController(
            ILogger<APIController> logger,
            ICommonRepository repository,
            IWebHostEnvironment webHostEnvironment,
            IAuthorizationService authorization,
            IConfiguration configuration)
        {
            _logger = logger;
            _repository = repository;
            _webHostEnvironment = webHostEnvironment;
            _authorization = authorization;
            _configuration = configuration;
        }
        public IActionResult SVGIcon(string shape, string colour, string border_colour = "", string label = "", int height = 50, int width = 50)
        {
            string icon_path = Path.Combine(_webHostEnvironment.WebRootPath, "img/svg-icons");
            string source_svg_path = Path.Combine(icon_path, "map-marker-alt.svg");
            switch (shape.ToLower() ?? "")
            {
                case "circle":
                    {
                        if (string.IsNullOrEmpty(label))
                        {
                            source_svg_path = Path.Combine(icon_path, "circle.svg");
                        }
                        else
                        {
                            source_svg_path = Path.Combine(icon_path, "circle-label.svg");
                        }

                        break;
                    }

                case "filled-marker":
                    {
                        if (string.IsNullOrEmpty(label))
                        {
                            source_svg_path = Path.Combine(icon_path, "map-marker.svg");
                        }
                        else
                        {
                            source_svg_path = Path.Combine(icon_path, "map-marker-label.svg");
                        }

                        break;
                    }

                default:
                    {
                        if (!string.IsNullOrEmpty(label))
                        {
                            source_svg_path = Path.Combine(icon_path, "map-marker-alt-label.svg");
                        }

                        break;
                    }
            }

            var source_svg = SvgDocument.Open(source_svg_path);

            // change the shape fill
            source_svg.GetElementById("shape").Fill = new SvgColourServer(System.Drawing.ColorTranslator.FromHtml("#" + colour));
            if (!string.IsNullOrEmpty(label))
            {
                // add a label
                SvgTextBase txt = (SvgTextBase)source_svg.GetElementById("text");
                txt.Text = label;
            }

            if (!string.IsNullOrEmpty(border_colour))
            {
                // add a stroke colour
                source_svg.GetElementById("shape").Stroke = new SvgColourServer(System.Drawing.ColorTranslator.FromHtml("#" + border_colour));
                source_svg.GetElementById("shape").StrokeWidth = 15;
            }

            var outputImage = new System.Drawing.Bitmap(width, height);
            source_svg.Width = width;
            source_svg.Height = height;
            outputImage = source_svg.Draw();
            // stream it
            using (var ms = new MemoryStream())
            {
                outputImage.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                return File(ms.ToArray(), "image/png");
            }

        }

        public IActionResult WebManifest(int id)
        {
            Data.Models.Version version;
            if(id == 0)
            {
                version = _repository.GetVersionBySlug("general","","");
            }
            else
            {
                version = _repository.GetVersion(id);
            }
            
            string appName = _configuration.GetValue<string>("GIFrameworkMaps:appName");
            if (version != null && version.Theme != null)
            {
                ManifestIcon largeIcon = new ManifestIcon
                {
                    Source = string.IsNullOrEmpty(version.Theme.CustomFaviconURL) ? Url.Content("~/android-chrome-512x512.png") : $"{version.Theme.CustomFaviconURL}/android-chrome-512x512.png",
                    Sizes = "512x512",
                    Type = "image/png"
                };

                ManifestIcon regularIcon = new ManifestIcon
                {
                    Source = string.IsNullOrEmpty(version.Theme.CustomFaviconURL) ? Url.Content("~/android-chrome-192x192.png") : $"{version.Theme.CustomFaviconURL}/android-chrome-192x192.png",
                    Sizes = "192x192",
                    Type = "image/png"
                };

                List<ManifestIcon> iconsList = new List<ManifestIcon>();
                iconsList.Add(largeIcon);
                iconsList.Add(regularIcon);


                var host = Request.Host.ToUriComponent();
                var pathBase = Request.PathBase.ToUriComponent();

                ManifestFile manifest = new ManifestFile
                {
                    Id = version.Slug,
                    StartURL = $"{Request.Scheme}://{host}{pathBase}/{(version.Slug == "general" ? "" : version.Slug)}",
                    Name = $"{version.Name}",
                    ShortName = appName,
                    ThemeColor = $"#{version.Theme.PrimaryColour}",
                    Icons = iconsList,
                    Display = "standalone"
                };

                return Json(manifest);
            }
            return NotFound();
        }

        public async Task<IActionResult> VersionConfiguration(int id)
        {
            var version = _repository.GetVersion(id);
            if (version != null)
            {
                if (!version.Enabled)
                {
                    return NotFound();
                }
                if (!string.IsNullOrEmpty(version.RedirectionURL) && Uri.IsWellFormedUriString(version.RedirectionURL, UriKind.Absolute))
                {
                    return NotFound();
                }

                var authResult = await _authorization.AuthorizeAsync(User, version, "CanAccessVersion");

                if (authResult.Succeeded)
                {
                    var versionViewModel = _repository.GetVersionViewModel(id);

                    var host = Request.Host.ToUriComponent();
                    var pathBase = Request.PathBase.ToUriComponent();
                    versionViewModel.AppRoot = $"{host}{pathBase}/";
                    versionViewModel.GoogleMapsAPIKey = _configuration.GetValue<string>("ApiKeys:Google:MapsAPIKey");
                    versionViewModel.AppInsightsKey = _configuration.GetValue<string>("ApplicationInsights:ConnectionString");
                    return Json(versionViewModel);
                }
                else
                {
                    return Unauthorized();
                }
            }
            return NotFound();                    
        }

        public IActionResult WebLayerServiceDefinitions()
        {
            var services = _repository.GetWebLayerServiceDefinitions();
            return Json(services);
        }

        public string GenerateShortUrl(string url)
        {
            string shortUrl = "";
            if (Uri.IsWellFormedUriString(url, UriKind.Absolute))
            {
                shortUrl = _repository.GenerateShortUrl(url);
            }
            return shortUrl;
        }

    }

 }
