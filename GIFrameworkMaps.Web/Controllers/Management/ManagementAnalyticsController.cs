using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.Graph.Beta.Models;
using Microsoft.Kiota.Http.Generated;
using System;
using System.Collections.Generic;
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
            AnalyticsViewModel viewModel = _repository.GetAnalyticsModel();

            return View(viewModel);
        }

        public IActionResult Create()
        {
            AnalyticsEditModel viewModel = new AnalyticsEditModel();
            viewModel.analyticDefinition =  new AnalyticsDefinition();
            viewModel = RebuildEditModel(viewModel);
            return View(viewModel);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(AnalyticsEditModel editModel, int[] selectedVersions)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    editModel.SelectedVersions = selectedVersions.ToList();
                    editModel.analyticDefinition.DateModified = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
                    var analyticDefinitions = _context.AnalyticsDefinitions;
                    analyticDefinitions.Add(editModel.analyticDefinition);
                    //Update the versions this analytic will apply to
                    editModel.analyticDefinition.VersionAnalytics = new List<VersionAnalytic>();
                    foreach ( int version in editModel.SelectedVersions )
                    {
                        editModel.analyticDefinition.VersionAnalytics.Add(new VersionAnalytic
                        {
                            VersionId = version,
                            AnalyticsDefinitionId = editModel.analyticDefinition.Id
                        });
                    }
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
            viewModel = RebuildEditModel(viewModel);
            return View(viewModel);
        }
        public IActionResult Edit(int id)
        {
            var analyticRecord = _context.AnalyticsDefinitions.Include(ad => ad.VersionAnalytics).Where(a => a.Id == id).FirstOrDefault();
            if (analyticRecord != null)
            {
                AnalyticsEditModel viewModel = new AnalyticsEditModel();
                viewModel.analyticDefinition = analyticRecord;
                viewModel = RebuildEditModel(viewModel);
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
        public async Task<IActionResult> Edit(AnalyticsEditModel editModel, int[] selectedVersions)
        {
            try
            {
                editModel.SelectedVersions = selectedVersions.ToList();
                var analyticRecord = _context.AnalyticsDefinitions.Include(ad => ad.VersionAnalytics).Where(a => a.Id == editModel.analyticDefinition.Id).FirstOrDefault();
                if (analyticRecord != null)
                {
                    analyticRecord.DateModified = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);
                    analyticRecord.ProductKey = editModel.analyticDefinition.ProductKey;
                    analyticRecord.ProductName = editModel.analyticDefinition.ProductName;
                    analyticRecord.CookieControl = editModel.analyticDefinition.CookieControl;
                    analyticRecord.Enabled = editModel.analyticDefinition.Enabled;
                    UpdateVersionAnalytics(editModel, analyticRecord);
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
            viewModel = RebuildEditModel(viewModel);
            return View(viewModel);
        }

        public IActionResult Remove(int id)
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

        private AnalyticsEditModel RebuildEditModel(AnalyticsEditModel model)
        {
            var versions = _context.Versions.OrderBy(b => b.Name).ToList();
            string[] supportedProducts = { "Cloudflare", "Google Analytics (GA4)", "Microsoft Application Insights", "Microsoft Clarity" };
            string[] supportedCookieControls = { "Civica Cookie Control" };

            model.availableProducts = new SelectList(supportedProducts);
            model.availableCookieControl = new SelectList(supportedCookieControls);
            model.AvailableVersions = versions;
            if (model.analyticDefinition.VersionAnalytics != null)
            {
                model.SelectedVersions = model.analyticDefinition.VersionAnalytics.Select(c => c.VersionId).ToList();
            }
            ViewData["AllVersions"] = model.AvailableVersions;
            ViewData["SelectedVersions"] = model.SelectedVersions;

            return model;
        }
        private void UpdateVersionAnalytics(AnalyticsEditModel editModel, AnalyticsDefinition _contextRecord)
        {
            //Update the versions this analytic will apply to
            List<int> toRemove = new List<int>();
            List<int> toIgnore = new List<int>();
            foreach (VersionAnalytic s in _contextRecord.VersionAnalytics)
            {
                if (editModel.SelectedVersions != null && editModel.SelectedVersions.ToArray().Contains(s.VersionId))
                {
                    //Do nothing
                    toIgnore.Add(s.VersionId);
                }
                else
                {
                    //Must have been removed
                    toRemove.Add(s.VersionId);
                }
            }
            if (editModel.SelectedVersions != null)
            {
                foreach (int v in editModel.SelectedVersions)
                {
                    if (!toIgnore.Contains(v))
                    {
                        _contextRecord.VersionAnalytics.Add(new VersionAnalytic
                        {
                            VersionId = v,
                            AnalyticsDefinitionId = editModel.analyticDefinition.Id
                        });
                    }
                }
            }
            foreach (int v in toRemove)
            {
                var record = _contextRecord.VersionAnalytics.Where(a => a.VersionId == v).FirstOrDefault();
                _contextRecord.VersionAnalytics.Remove(record);
            }

        }
    }
}
