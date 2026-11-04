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
			if (User.IsAuthenticated)
			{
				userId = User.UserId;
				email = User.Email;
			}
			var versions = await commonRepository.GetVersionsListForUser(userId, email);
			return View(versions);
		}
	}
}
