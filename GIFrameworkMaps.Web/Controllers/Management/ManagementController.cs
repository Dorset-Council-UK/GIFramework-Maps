﻿using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{


    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementController : Controller
    {
        //dependancy injection
        private readonly ICommonRepository _repository;
        public ManagementController(
            ICommonRepository repository
            )
        {

            _repository = repository;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult BroadcastMessage()
        {
            var versions = _repository.GetVersions();
            return View(versions);
        }
    }
}
