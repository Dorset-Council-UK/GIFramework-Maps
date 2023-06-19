using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
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
    [Authorize(Roles = "GIFWAdmin")]
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
            RebuildEditModel(ref viewModel);
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
                    //Update the versions this analytic will apply to
                    editModel.analyticDefinition.VersionAnalytics = new List<VersionAnalytic>();
                    foreach (int version in editModel.SelectedVersions)
                    {
                        editModel.analyticDefinition.VersionAnalytics.Add(new VersionAnalytic
                        {
                            VersionId = version,
                            AnalyticsDefinitionId = editModel.analyticDefinition.Id
                        });
                    }
                    _context.Add(editModel.analyticDefinition);
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
            RebuildEditModel(ref viewModel);
            return View(viewModel);
        }
        public IActionResult Edit(int id)
        {
            var analyticRecord = _context.AnalyticsDefinitions.Include(ad => ad.VersionAnalytics).Where(a => a.Id == id).FirstOrDefault();
            if (analyticRecord != null)
            {
                AnalyticsEditModel viewModel = new AnalyticsEditModel();
                viewModel.analyticDefinition = analyticRecord;
                RebuildEditModel(ref viewModel);
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
                var analyticRecord = _context.AnalyticsDefinitions.Where(a => a.Id == editModel.analyticDefinition.Id).FirstOrDefault();
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
            RebuildEditModel(ref viewModel);
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

        private void RebuildEditModel(ref AnalyticsEditModel model)
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
        }
        private void UpdateVersionAnalytics(AnalyticsEditModel editModel, AnalyticsDefinition _contextRecord)
        {
            //Update the versions this analytic will apply to
            if (editModel.SelectedVersions == null)
            {
                editModel.AvailableVersions = new List<Data.Models.Version>();
                return;
            }

            //Create a HashSet of all the selected integers
            var selectedVersionsHS = new HashSet<int>(editModel.SelectedVersions);
            //Create a HashSet of the existing list from the database
            var analyticVersions = new HashSet<int>();
            var currentDefinition = _context.AnalyticsDefinitions.Include(ad => ad.VersionAnalytics).FirstOrDefault(a => a.Id == editModel.analyticDefinition.Id);
            if (currentDefinition.VersionAnalytics != null)
            {
                analyticVersions = new HashSet<int>(currentDefinition.VersionAnalytics.Select(c => c.VersionId));
            }
            //Generate a list of all versions that can be selected
            List<int> AvailableVersions = _context.Versions.OrderBy(b => b.Name).Select(c => c.Id).ToList();
            if (AvailableVersions != null)
            {
                //Loop through each version and check if it is selected
                foreach (int id in AvailableVersions)
                {
                    if (selectedVersionsHS.Contains(id))
                    {
                        //If it is selected but not in the database we add it
                        if (!analyticVersions.Contains(id))
                        {
                            if (_contextRecord.VersionAnalytics == null)
                            {
                                _contextRecord.VersionAnalytics = new List<VersionAnalytic>();
                            }
                            _contextRecord.VersionAnalytics.Add(new VersionAnalytic
                            {
                                VersionId = id,
                                AnalyticsDefinitionId = editModel.analyticDefinition.Id
                            });
                        }
                    }
                    else
                    {
                        //If it is not selected but is in the database we remove it
                        if (analyticVersions.Contains(id))
                        {
                            VersionAnalytic versionAnalyticToRemove = currentDefinition.VersionAnalytics.FirstOrDefault(i => i.VersionId == id && i.AnalyticsDefinitionId == editModel.analyticDefinition.Id);
                            _context.Remove(versionAnalyticToRemove);
                        }
                    }
                } //Everything else is just left alone
            }
        }
    }
}
