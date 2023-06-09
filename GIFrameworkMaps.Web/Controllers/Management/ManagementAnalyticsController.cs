using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.Graph.Beta.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    public class ManagementAnalyticsController : Controller
    {
        private readonly ILogger<ManagementVersionController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementAnalyticsController(
            ILogger<ManagementVersionController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }
        public IActionResult Index()
        {
            AnalyticsAndCookieModel viewModel = _repository.GetAnalyticsAndCookieModel();

            return View(viewModel);
        }

        public IActionResult AddAnalytic()
        {
            AnalyticsEditModel viewModel = new AnalyticsEditModel();
            viewModel.analyticDefinition =  new AnalyticsDefinition();
            return View(viewModel);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddAnalytic(AnalyticsEditModel editModel)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    editModel.analyticDefinition.DateModified = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
                    var analyticDefinitions = _context.AnalyticsDefinitions;
                    analyticDefinitions.Add(editModel.analyticDefinition);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Add analytic failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            } 
            
            AnalyticsEditModel viewModel = new AnalyticsEditModel();
            viewModel.analyticDefinition = editModel.analyticDefinition;
            return View(viewModel);
        }
        public IActionResult EditAnalytic(int id)
        {
            var analyticRecord = _context.AnalyticsDefinitions.Where(a => a.Id == id).FirstOrDefault();
            if (analyticRecord != null)
            {
                AnalyticsEditModel viewModel = new AnalyticsEditModel();
                viewModel.analyticDefinition = analyticRecord;
                return View(viewModel);
            }
            else
            {
                ModelState.AddModelError("", "Unable to find the record. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditAnalytic(AnalyticsEditModel editModel)
        {
            try
            {
                var analyticRecord = _context.AnalyticsDefinitions.Where(a => a.Id == editModel.analyticDefinition.Id).FirstOrDefault();
                if (analyticRecord != null)
                {
                    analyticRecord.DateModified = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
                    analyticRecord.ProductKey = editModel.analyticDefinition.ProductKey;
                    analyticRecord.ProductName = editModel.analyticDefinition.ProductName;
                    analyticRecord.Enabled = editModel.analyticDefinition.Enabled;

                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                else
                {
                    _logger.LogError("Edit analytic failed - record not found");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Edit analytic failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            AnalyticsEditModel viewModel = new AnalyticsEditModel();
            viewModel.analyticDefinition = editModel.analyticDefinition;
            return View(viewModel);
        }

        public IActionResult RemoveAnalytic(int id)
        {
            try
            {
                var analyticRecord = _context.AnalyticsDefinitions.Where(a => a.Id == id).FirstOrDefault();
                if (analyticRecord != null)
                {
                    _context.Remove(analyticRecord);
                    _context.SaveChanges();
                    return RedirectToAction(nameof(Index));
                }
                else
                {
                    _logger.LogError("Remove analytic failed - record not found");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }


            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Remove analytic failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            return RedirectToAction(nameof(Index));
        }

        //public bool AddCookieControl(CookieControlDefinition cookieControl)
        //{
        //    return false;
        //}

        //public bool EditCookieControl(CookieControlDefinition cookieControl)
        //{
        //    return false;
        //}

        //public bool RemoveCookieControl(CookieControlDefinition cookieControl)
        //{
        //    return false;
        //}
    }
}
