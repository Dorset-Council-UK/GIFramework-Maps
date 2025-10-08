using System.Security.Claims;
using System.Threading.Tasks;
using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Mvc;

namespace GIFrameworkMaps.Web.Controllers.Version
{
	public class VersionController(ICommonRepository commonRepository) : Controller
	{
		public async Task<IActionResult> Index()
		{
			var userId = "";
			var email = "";
			if (User.Identity.IsAuthenticated)
			{
				var claimsIdentity = (ClaimsIdentity)User.Identity;
				var claim = claimsIdentity.FindFirst(ClaimTypes.NameIdentifier);
				userId = claim.Value;
				var emailClaim = claimsIdentity.FindFirst(c => c.Type.Contains("email"));
				email = emailClaim?.Value ?? string.Empty;
			}
			var versions = await commonRepository.GetVersionsListForUser(userId, email);
			return View(versions);
		}
	}
}
