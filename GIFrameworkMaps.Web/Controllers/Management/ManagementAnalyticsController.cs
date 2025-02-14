using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NodaTime;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
	[Authorize(Roles = "GIFWAdmin")]
    public class ManagementAnalyticsController(
			ILogger<ManagementVersionController> logger,
			IManagementRepository repository,
			ApplicationDbContext context
			) : Controller
    {
        private readonly ILogger<ManagementVersionController> _logger = logger;
        private readonly IManagementRepository _repository = repository;
        private readonly ApplicationDbContext _context = context;

		public async Task<IActionResult> Index()
        {
            var viewModel = await _repository.GetAnalyticsModel();

            return View(viewModel);
        }

        public async Task<IActionResult> Create()
        {
			AnalyticsEditViewModel viewModel = new()
			{
				AnalyticDefinition = new AnalyticsDefinition()
			};
			await RebuildEditModel(viewModel);
            return View(viewModel);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(AnalyticsEditViewModel editModel, int[] selectedVersions)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    editModel.SelectedVersions = selectedVersions.ToList();
                    editModel.AnalyticDefinition.DateModified = SystemClock.Instance.GetCurrentInstant();
                    //Update the versions this analytic will apply to
                    foreach (int version in editModel.SelectedVersions)
                    {
                        editModel.AnalyticDefinition.VersionAnalytics.Add(new VersionAnalytic
                        {
                            VersionId = version,
                            AnalyticsDefinitionId = editModel.AnalyticDefinition.Id
                        });
                    }
                    _context.Add(editModel.AnalyticDefinition);
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

			AnalyticsEditViewModel viewModel = new()
			{
				AnalyticDefinition = editModel.AnalyticDefinition
			};
			await RebuildEditModel(viewModel);
            return View(viewModel);
        }
        public async Task<IActionResult> Edit(int id)
        {
            var analyticRecord = _context.AnalyticsDefinitions.Include(ad => ad.VersionAnalytics).Where(a => a.Id == id).FirstOrDefault();
            if (analyticRecord != null)
            {
				AnalyticsEditViewModel viewModel = new()
				{
					AnalyticDefinition = analyticRecord
				};
				await RebuildEditModel(viewModel);
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
        public async Task<IActionResult> Edit(AnalyticsEditViewModel editModel, int[] selectedVersions)
        {
            try
            {
                editModel.SelectedVersions = selectedVersions.ToList();
                var analyticRecord = _context.AnalyticsDefinitions.Where(a => a.Id == editModel.AnalyticDefinition.Id).FirstOrDefault();
                if (analyticRecord != null)
                {
                    analyticRecord.DateModified = SystemClock.Instance.GetCurrentInstant();
                    analyticRecord.ProductKey = editModel.AnalyticDefinition.ProductKey;
                    analyticRecord.ProductName = editModel.AnalyticDefinition.ProductName;
                    analyticRecord.CookieControl = editModel.AnalyticDefinition.CookieControl;
                    analyticRecord.Enabled = editModel.AnalyticDefinition.Enabled;
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
			AnalyticsEditViewModel viewModel = new()
			{
				AnalyticDefinition = editModel.AnalyticDefinition
			};
			  await RebuildEditModel(viewModel);
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

        private async Task RebuildEditModel(AnalyticsEditViewModel model)
        {
			var versions = _context.Versions
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.OrderBy(o => o.Name);

			string[] supportedProducts = ["Cloudflare", "Google Analytics (GA4)", "Microsoft Application Insights", "Microsoft Clarity"];
            string[] supportedCookieControls = ["Civic Cookie Control"];

            model.AvailableProducts = new SelectList(supportedProducts);
            model.AvailableCookieControl = new SelectList(supportedCookieControls);
            model.AvailableVersions = await versions.ToListAsync();
            if (model.AnalyticDefinition.VersionAnalytics.Count != 0)
            {
                model.SelectedVersions = model.AnalyticDefinition.VersionAnalytics.Select(c => c.VersionId).ToList();
            }
            ViewData["AllVersions"] = model.AvailableVersions;
            ViewData["SelectedVersions"] = model.SelectedVersions;
        }
        private void UpdateVersionAnalytics(AnalyticsEditViewModel editModel, AnalyticsDefinition _contextRecord)
        {
			var currentDefinition = _context.AnalyticsDefinitions.Include(ad => ad.VersionAnalytics).FirstOrDefault(a => a.Id == editModel.AnalyticDefinition.Id);

			//Update the versions this analytic will apply to
			if (editModel.SelectedVersions.Count == 0)
            {
				//get rid of all versions in the analytics definition
				var versionAnalyticsToRemove = currentDefinition.VersionAnalytics.Where(i => i.AnalyticsDefinitionId == editModel.AnalyticDefinition.Id);
				_context.RemoveRange(versionAnalyticsToRemove);
				return;
            }

            //Create a HashSet of all the selected integers
            var selectedVersionsHS = new HashSet<int>(editModel.SelectedVersions);
            //Create a HashSet of the existing list from the database
            var analyticVersions = new HashSet<int>();
            if (currentDefinition.VersionAnalytics.Count != 0)
            {
                analyticVersions = new HashSet<int>(currentDefinition.VersionAnalytics.Select(c => c.VersionId));
            }
            //Generate a list of all versions that can be selected
			var versionIds = _context.Versions
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.OrderBy(o => o.Name)
				.Select(c => c.Id)
				.ToList();
			List<int> AvailableVersions = [.. _context.Versions.OrderBy(b => b.Name).Select(c => c.Id)];
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
                            _contextRecord.VersionAnalytics.Add(new VersionAnalytic
                            {
                                VersionId = id,
                                AnalyticsDefinitionId = editModel.AnalyticDefinition.Id
                            });
                        }
                    }
                    else
                    {
                        //If it is not selected but is in the database we remove it
                        if (analyticVersions.Contains(id))
                        {
                            VersionAnalytic versionAnalyticToRemove = currentDefinition.VersionAnalytics.FirstOrDefault(i => i.VersionId == id && i.AnalyticsDefinitionId == editModel.AnalyticDefinition.Id);
                            _context.Remove(versionAnalyticToRemove);
                        }
                    }
                } //Everything else is just left alone
            }
        }
    }
}
