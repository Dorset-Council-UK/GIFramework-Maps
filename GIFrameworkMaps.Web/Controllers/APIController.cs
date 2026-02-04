using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Web.Models.API;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Svg;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers
{
	public class APIController(
			ILogger<APIController> logger,
			ICommonRepository repository,
			IWebHostEnvironment webHostEnvironment,
			IAuthorizationService authorization,
			IOptions<GIFrameworkMapsOptions> options,
			IOptions<ApiKeyOptions> apiKeyOptions,
			ApplicationDbContext context) : Controller
    {
        //dependency injection
        private readonly ILogger<APIController> _logger = logger;
        private readonly ICommonRepository _repository = repository;
        private readonly IWebHostEnvironment _webHostEnvironment = webHostEnvironment;
		private readonly GIFrameworkMapsOptions _options = options.Value;
		private readonly ApiKeyOptions _apiKeyOptions = apiKeyOptions.Value;
		private readonly IAuthorizationService _authorization = authorization;
        private readonly ApplicationDbContext _context = context;

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
                version = await _repository.GetVersionBySlug("general", "", "");
            }
            else
            {
                version = await _repository.GetVersion(id);
            }
            
			string appName = _options.appName;
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

                List<ManifestIcon> iconsList =
				[
					largeIcon,
                    regularIcon
                ];

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
                    var versionViewModel = await _repository.GetVersionViewModel(version);

                    var host = Request.Host.ToUriComponent();
                    var pathBase = Request.PathBase.ToUriComponent();
                    versionViewModel.AppRoot = $"{host}{pathBase}/";
					versionViewModel.GoogleMapsAPIKey = _apiKeyOptions?.Google?.MapsApiKey ?? string.Empty;
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

		public async Task<IActionResult> InfoTemplate(int id)
		{
			var template = await _repository.GetInfoTemplateByLayerId(id);
			if (string.IsNullOrEmpty(template))
			{
				return NoContent();
			}
			return Content(template);
		}

		public async Task<IActionResult> InfoListTitleTemplate(int id)
		{
			var template = await _repository.GetInfoListTitleTemplateByLayerId(id);
			if (string.IsNullOrEmpty(template))
			{
				return NoContent();
			}
			return Content(template);
		}

		public async Task<IActionResult> LayerSourceDescription(int id)
		{
			var description = await _repository.GetLayerSourceDescriptionById(id);
			if (string.IsNullOrEmpty(description))
			{
				return NoContent();
			}
			return Content(description);
		}

		public IActionResult WebLayerServiceDefinitions()
        {
            var services = _repository.GetWebLayerServiceDefinitions();
            return Json(services);
        }

        [HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> GenerateShortUrl([FromForm] string url)
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
		[ValidateAntiForgeryToken]
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
		[Route("api/versions/recent")]
		public async Task<IActionResult> RecentVersions(string versionIds)
		{
			var userId = "";
			var email = "";
			if(User.Identity.IsAuthenticated)
			{
				var claimsIdentity = (ClaimsIdentity)User.Identity;
				var claim = claimsIdentity.FindFirst(ClaimTypes.NameIdentifier);
				userId = claim.Value;
				var emailClaim = claimsIdentity.FindFirst(c => c.Type.Contains("email"));
				email = emailClaim?.Value ?? string.Empty;
			}
			var userVersions = await _repository.GetVersionsListForUser(userId, email);

			var parsedVersionIds = versionIds?.Split(',')
			.Where(x => int.TryParse(x, out _))
			.Select(int.Parse)
			.ToList();

			List<RecentOrFeaturedVersionsList> recent_versions = [];
			List<RecentOrFeaturedVersionsList> featured_versions = [];
			if (parsedVersionIds != null && parsedVersionIds.Count != 0)
			{
				//filter the list just to those passed in versionIds
				recent_versions = userVersions
									.Where(v => parsedVersionIds.Contains(v.Id)) //get just the ones that match the passed in IDs
									.OrderBy(v => parsedVersionIds.IndexOf(v.Id)) //order it by the order they were passed in
									.Take(5) // take a maximum of 5
									.Select(v =>
									new RecentOrFeaturedVersionsList(
										v.Id,
										v.Name,
										Url.Link("Default_Slug", new
										{
											slug1 = v.Slug.Split("/").FirstOrDefault(),
											slug2 = v.Slug.Split("/").ElementAtOrDefault(1),
											slug3 = v.Slug.Split("/").ElementAtOrDefault(2)
										}),
										VersionListType.Recent
										) //project the data into the RecentOrFeaturedVersionsList type
									).ToList();
			}
			if(recent_versions.Count < 5)
			{
				//filter the list just to the featured
				featured_versions = userVersions
									.Where(v => v.FeaturedVersion == true && !recent_versions.Select(v => v.Id).Contains(v.Id)) //select only featured versions that do not already appear in the recent versions list
									.OrderBy(v => v.Name)
									.Take(5 - recent_versions.Count) //Take a number that would mean the total being returned is no more than 5
									.Select(v =>
									new RecentOrFeaturedVersionsList(
										v.Id,
										v.Name,
										Url.Link("Default_Slug", new
										{
											slug1 = v.Slug.Split("/").FirstOrDefault(),
											slug2 = v.Slug.Split("/").ElementAtOrDefault(1),
											slug3 = v.Slug.Split("/").ElementAtOrDefault(2)
										}),
										VersionListType.Featured
										) //project the data into the RecentOrFeaturedVersionsList type
									).ToList();
			}

			List<RecentOrFeaturedVersionsList> combined_versions_list = [.. recent_versions, .. featured_versions];

			if(combined_versions_list.Count == 0)
			{
				return NoContent();
			}

			return Json(combined_versions_list);
		}
		private readonly record struct RecentOrFeaturedVersionsList(int Id, string Name, string URL, VersionListType Type);
		public enum VersionListType
		{
			Recent,
			Featured,
			Favourite
		}
	}
 }
