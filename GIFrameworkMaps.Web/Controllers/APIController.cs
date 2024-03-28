using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Web.Models.API;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Svg;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
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
        private readonly ApplicationDbContext _context;

        public APIController(
            ILogger<APIController> logger,
            ICommonRepository repository,
            IWebHostEnvironment webHostEnvironment,
            IAuthorizationService authorization,
            IConfiguration configuration,
            ApplicationDbContext context)
        {
            _logger = logger;
            _repository = repository;
            _webHostEnvironment = webHostEnvironment;
            _authorization = authorization;
            _configuration = configuration;
            _context = context;
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
            source_svg.Width = width;
            source_svg.Height = height;
            // stream it
            using var ms = new MemoryStream();
			source_svg.Write(ms);
            return File(ms.ToArray(), "image/svg+xml");
        }

        public async Task<IActionResult> WebManifest(int id)
        {
            Data.Models.Version version;
            if(id == 0)
            {
                version = _repository.GetVersionBySlug("general","","");
            }
            else
            {
                version = await _repository.GetVersion(id);
            }
            
            string appName = _configuration.GetValue<string>("GIFrameworkMaps:appName");
            if (version != null && version.Theme != null)
            {
                ManifestIcon largeIcon = new()
                {
                    Source = string.IsNullOrEmpty(version.Theme.CustomFaviconURL) ? Url.Content("~/android-chrome-512x512.png") : $"{version.Theme.CustomFaviconURL}/android-chrome-512x512.png",
                    Sizes = "512x512",
                    Type = "image/png"
                };

                ManifestIcon regularIcon = new()
                {
                    Source = string.IsNullOrEmpty(version.Theme.CustomFaviconURL) ? Url.Content("~/android-chrome-192x192.png") : $"{version.Theme.CustomFaviconURL}/android-chrome-192x192.png",
                    Sizes = "192x192",
                    Type = "image/png"
                };

                List<ManifestIcon> iconsList = new()
                {
                    largeIcon,
                    regularIcon
                };

                var host = Request.Host.ToUriComponent();
                var pathBase = Request.PathBase.ToUriComponent();

                ManifestFile manifest = new()
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
            var version = await _repository.GetVersion(id);
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
                    var versionViewModel = _repository.GetVersionViewModel(version);

                    var host = Request.Host.ToUriComponent();
                    var pathBase = Request.PathBase.ToUriComponent();
                    versionViewModel.AppRoot = $"{host}{pathBase}/";
                    versionViewModel.GoogleMapsAPIKey = _configuration.GetValue<string>("ApiKeys:Google:MapsAPIKey");
                    versionViewModel.IsLoggedIn = User.Identity.IsAuthenticated;
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

        [HttpPost]
        public async Task<IActionResult> GenerateShortUrl(string url)
        {
            if (Uri.IsWellFormedUriString(url, UriKind.Absolute) && _repository.IsURLCurrentApplication(url))
            {
                string shortId = await _repository.GenerateShortId(url);
                if(shortId == null)
                {
                    return StatusCode(500);
                }
                await _context.ShortLinks.AddAsync(new ShortLink { 
                    ShortId = shortId,
                    FullUrl = url
                });
                await _context.SaveChangesAsync();

                string shortLink = Url.RouteUrl("UserShortLink", new { id = shortId }, Request.Scheme);
                return Created(shortLink, shortLink);
            }
            else
            {
                return BadRequest();
            }
        }

        [Authorize]
        [Route("api/bookmarks")]
        public async Task<IActionResult> UserBookmarks()
        {
            var claimsIdentity = (ClaimsIdentity)User.Identity;
            var claim = claimsIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = claim.Value;

            var bookmarks = await _repository.GetBookmarksForUserAsync(userId);

            return Json(bookmarks);

        }

        [Authorize]
        [HttpDelete]
        [Route("api/bookmarks/delete/{id}")]
        public async Task<IActionResult> DeleteBookmark(int id)
        {
            var claimsIdentity = (ClaimsIdentity)User.Identity;
            var claim = claimsIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = claim.Value;
            //get the bookmark
            
            var bookmarkToDelete = await _context.Bookmarks.Where(b => b.Id == id && b.UserId == userId).FirstOrDefaultAsync();
            if(bookmarkToDelete != null)
            {
                try
                {
                    _context.Bookmarks.Remove(bookmarkToDelete);
                    await _context.SaveChangesAsync();
                    //return HTTP 204 response
                    return NoContent();
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Bookmark delete failed");
                    return StatusCode(500, "Bookmark delete failed");
                }
            }
            else
            {
                return Unauthorized();
            }
        }

        [Authorize()]
        [HttpPost]
        [Route("api/bookmarks/create")]
        public async Task<IActionResult> AddBookmark(Bookmark bookmark)
        {
            var claimsIdentity = (ClaimsIdentity)User.Identity;
            var claim = claimsIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = claim.Value;
            bookmark.UserId = userId;
            bookmark.Name = bookmark.Name?.Trim();
            ModelState.Remove("UserId"); //remove this from model state as it is not required
            if (ModelState.IsValid)
            {
                //additional validation here
                var existingBookmark = await _context.Bookmarks.Where(b => b.UserId == userId && b.Name == bookmark.Name).FirstOrDefaultAsync();
                if (existingBookmark == null)
                {

                    try
                    {
                        _context.Add(bookmark);
                        await _context.SaveChangesAsync();
                        return Created("", "");
                    }
                    catch (DbUpdateException ex)
                    {
                        _logger.LogError(ex, "Bookmark creation failed");
                        return StatusCode(500, "Bookmark creation failed");
                    }
                }
                else
                {
                    return BadRequest("Bookmark with this name already exists");
                }
            }
            else
            {
                return BadRequest("Name must be filled in and less than 50 characters");
            }           
        }
    }
 }
