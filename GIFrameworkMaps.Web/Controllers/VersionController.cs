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
			var versions = await _repository.GetVersions();
			return View(versions);
		}

	}
}
