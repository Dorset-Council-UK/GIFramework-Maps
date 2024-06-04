using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Web;

namespace GIFrameworkMaps.Web.Controllers
{
	[Authorize]
	public class AccountController(ICommonRepository repository, ApplicationDbContext context) : Controller
	{
		private readonly ICommonRepository _repository = repository;
		private readonly ApplicationDbContext _context = context;

		public IActionResult Index()
		{
			return View();
		}

		[AllowAnonymous]
		public async Task<IActionResult> SignInWithRedirect(string redirectUri)
		{
			StringWriter decodedStringWriter = new();
			string decodedString;
			// Decode the encoded string.
			HttpUtility.HtmlDecode(redirectUri, decodedStringWriter);
			decodedString = decodedStringWriter.ToString();
			//generate short link for redirectUri
			if (Uri.IsWellFormedUriString(decodedString, UriKind.Absolute) && _repository.IsURLCurrentApplication(decodedString))
			{
				string shortId = await _repository.GenerateShortId(decodedString);
				if (shortId == null)
				{
					return RedirectToAction("SignIn", "Account", new { area = "MicrosoftIdentity", redirectUri = decodedString });
				}

				await _context.ShortLinks.AddAsync(new ShortLink
				{
					ShortId = shortId,
					FullUrl = decodedString
				});
				await _context.SaveChangesAsync();

				Uri shortLink = new(Url.RouteUrl("UserShortLink", new { id = shortId }, Request.Scheme));

				string relativeShortLink = shortLink.IsAbsoluteUri ? shortLink.PathAndQuery : shortLink.OriginalString;

				return RedirectToAction("SignIn", "Account", new { area = "MicrosoftIdentity", redirectUri = relativeShortLink });
			}
			else
			{
				return RedirectToAction("SignIn", "Account", new { area = "MicrosoftIdentity" });

			}
		}
	}
}
