using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementSystemController(
		ILogger<ManagementSystemController> logger,
		IManagementRepository repository
			) : Controller
    {
        //dependency injection
        private readonly ILogger<ManagementSystemController> _logger = logger;
        private readonly IManagementRepository _repository = repository;

		public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public IActionResult PurgeCache()
        {
            var success=false;
            if (_repository.PurgeCache())
            {
                success = true;
                _logger.LogInformation("Memory Cache purged by {user}", User.Identity.Name);
            }
            TempData["Message"] = $"Cache was {(success ? "successfully" : "not")} purged";
            TempData["MessageType"] = success ? "success" : "error";
            return RedirectToAction("Index");
        }
	}
}
