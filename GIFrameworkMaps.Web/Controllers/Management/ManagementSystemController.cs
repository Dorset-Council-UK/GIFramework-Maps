﻿using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementSystemController : Controller
    {
        //dependancy injection
        private readonly ILogger<ManagementSystemController> _logger;
        private readonly IManagementRepository _repository;
        public ManagementSystemController(
            ILogger<ManagementSystemController> logger,
            IManagementRepository repository
            )
        {
            _logger = logger;
            _repository = repository;
        }

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
            TempData["Message"] = $"Cache was {(success ? "sucessfully" : "not")} purged";
            TempData["MessageType"] = success ? "success" : "error";
            return RedirectToAction("Index");
        }
	}
}
