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
			if (User.Identity.IsAuthenticated)
			{
				var claimsIdentity = (ClaimsIdentity)User.Identity;
				var claim = claimsIdentity.FindFirst(ClaimTypes.NameIdentifier);
				userId = claim.Value;
			}
			var versions = await commonRepository.GetVersionsListForUser(userId);
			return View(versions);
		}
	}
}
