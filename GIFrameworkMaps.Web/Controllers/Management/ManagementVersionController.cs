using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementVersionController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementAttributionController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementVersionController(
            ILogger<ManagementAttributionController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Version
        public async Task<IActionResult> Index()
        {
            var attributions = await _repository.GetVersions();
            return View(attributions);
        }

        // GET: Attribution/Create
        public IActionResult Create()
        {
            var version = new Data.Models.Version();
            var editModel = new VersionEditModel() { Version = version };
            RebuildViewModel(ref editModel, version);
            return View(editModel);
        }

        //POST: Attribution/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(VersionEditModel editModel)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.Version);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Version creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }

            editModel = new VersionEditModel() { Version = editModel.Version };
            RebuildViewModel(ref editModel, editModel.Version);
            return View(editModel);
        }

        // GET: Version/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var version = await _context.Versions.FirstOrDefaultAsync(v => v.Id == id);

            if (version == null)
            {
                return NotFound();
            }
            var editModel = new VersionEditModel() { Version = version };
            RebuildViewModel(ref editModel, version);
            return View(editModel);
        }

        // POST: Version/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var versionToUpdate = await _context.Versions.FirstOrDefaultAsync(a => a.Id == id);

            var editModel = new VersionEditModel() { Version = versionToUpdate };

            if (await TryUpdateModelAsync(
                editModel.Version,
                "Version",
                a => a.Name,
                a => a.Slug,
                a => a.Description,
                a => a.Enabled,
                a => a.RequireLogin,
                a => a.ShowLogin,
                a => a.HelpURL,
                a => a.FeedbackURL,
                a => a.RedirectionURL,
                a => a.ThemeId,
                a => a.BoundId,
                a => a.WelcomeMessageId,
                a => a.TourDetailsId
                ))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Version edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            
            RebuildViewModel(ref editModel, versionToUpdate);
            return View(editModel);
        }

        // GET: Version/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var version = await _repository.GetVersion(id);

            if (version == null)
            {
                return NotFound();
            }

            return View(version);
        }

        // POST: Version/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var versionToDelete = await _context.Versions.FirstOrDefaultAsync(a => a.Id == id);
            try
            {
                _context.Versions.Remove(versionToDelete);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Version delete failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            return View(versionToDelete);
        }

        private void RebuildViewModel(ref Data.Models.ViewModels.Management.VersionEditModel model, Data.Models.Version version)
        {
            var themes = _context.Theme.OrderBy(t => t.Name).ToList();
            var bounds = _context.Bound.OrderBy(t=> t.Name).ToList();
            var welcomeMessages = _context.WelcomeMessages.OrderBy(t => t.Name).ToList();
            var tours = _context.TourDetails.OrderBy(t => t.Name).ToList();
            
            model.AvailableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
            model.AvailableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
            model.AvailableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
            model.AvailableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);

        }

    }
}
