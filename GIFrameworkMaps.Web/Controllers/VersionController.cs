using System.Security.Claims;
using System.Threading.Tasks;
using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Mvc;

namespace GIFrameworkMaps.Web.Controllers.Version
{
	public class VersionController : Controller
	{
		private readonly ICommonRepository _commonRepository;
		private readonly IManagementRepository _repository;
		public VersionController(ICommonRepository commonRepository, IManagementRepository repository)
		{
			_commonRepository = commonRepository;
			_repository = repository;
		}

		public async Task<IActionResult> Index()
		{
			var userId = "";
			if (User.Identity.IsAuthenticated)
			{
				var claimsIdentity = (ClaimsIdentity)User.Identity;
				var claim = claimsIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
				userId = claim.Value;
			}
			
			
			var versions = await _commonRepository.GetVersionsListForUser(userId);
			return View(versions);
		}

	}
}
