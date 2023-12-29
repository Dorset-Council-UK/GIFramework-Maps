using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
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
        private readonly ILogger<ManagementVersionController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementVersionController(
            ILogger<ManagementVersionController> logger,
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
            var versions = await _repository.GetVersions();
            return View(versions);
        }

        // GET: Version/Create
        public IActionResult Create()
        {
            var version = new Data.Models.Version();
            var editModel = new VersionEditModel() { Version = version };
            RebuildViewModel(ref editModel, version);
            return View(editModel);
        }

        //POST: Version/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(VersionEditModel editModel, 
            int[] selectedBasemaps, 
            int defaultBasemap, 
            int[] selectedCategories,
            bool purgeCache)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.Version);
                    UpdateVersionBasemaps(selectedBasemaps, defaultBasemap, editModel.Version);
                    UpdateVersionCategories(selectedCategories,editModel.Version);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New version created";
                    TempData["MessageType"] = "success";
                    if (purgeCache)
                    {
                        _repository.PurgeCache();
                    }
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
            var version = await _context.Versions
                .Include(v => v.VersionBasemaps)
                    .ThenInclude(v => v.Basemap)
                .Include(v => v.VersionCategories)
                    .ThenInclude(v => v.Category)
                .FirstOrDefaultAsync(v => v.Id == id);

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
        public async Task<IActionResult> EditPost(int id, 
            int[] selectedBasemaps, 
            int defaultBasemap, 
            int[] selectedCategories,
            bool purgeCache)
        {
            var versionToUpdate = await _context.Versions
                .Include(v => v.VersionBasemaps)
                    .ThenInclude(v => v.Basemap)
                .Include(v => v.VersionCategories)
                    .ThenInclude(v => v.Category)
                .FirstOrDefaultAsync(v => v.Id == id);

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
                    UpdateVersionBasemaps(selectedBasemaps, defaultBasemap, versionToUpdate);
                    UpdateVersionCategories(selectedCategories, versionToUpdate);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Version edited";
                    TempData["MessageType"] = "success";

                    if (purgeCache)
                    {
                        _repository.PurgeCache();
                    }
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

        // GET: Version/ContactAlert/1
        public async Task<IActionResult> ContactAlert(int id)
        {
            try
            {
                var version = await _context.Versions
                                .Include(v => v.VersionContacts)
                                .FirstOrDefaultAsync(v => v.Id == id);

                if (version == null)
                {
                    return NotFound();
                }
                var editModel = new VersionEditModel() { Version = version };
                RebuildViewModel(ref editModel, version);
                foreach (var v in editModel.Version.VersionContacts)
                {
                    editModel.UserDetails.Add(v.UserId, await _repository.GetUser(v.UserId));
                }
                return View(editModel);
            } catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "We were unable to load the contacts for this version");
                ModelState.AddModelError("", "We were unable to load the contacts for this version. " +
                "Try again, and if the problem persists, " +
                "contact your system administrator.");
                return RedirectToAction("Edit", new { Id = id });
            }
        }

        // GET: Version/AddContact/1
        public async Task<IActionResult> AddContact(int id)
        {
            VersionAddContactModel ViewModel = new()
            {
                ContactEntry = new VersionContact { VersionId = id, VersionContactId = -1 },
                ListOfUsers = await _repository.GetUsers()
            };
            return View(ViewModel);
        }

        // POST: Version/AddContact
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddContact(VersionAddContactModel model)
        {
            if (ModelState.IsValid)
            {
                //Save the record
                try
                {
                    if (model.ContactEntry.VersionContactId == -1)
                    {
                        //This is a new record
                        _context.VersionContact.Add(new VersionContact
                        {
                            DisplayName = model.ContactEntry.DisplayName,
                            Enabled = model.ContactEntry.Enabled,
                            UserId = model.ContactEntry.UserId,
                            VersionId = model.ContactEntry.VersionId
                        });
                    }
                    else
                    {
                        VersionContact existingRecord = _context.VersionContact.FirstOrDefault(u => u.VersionContactId == model.ContactEntry.VersionContactId);
                        if (existingRecord != null)
                        {
                            existingRecord.DisplayName = model.ContactEntry.DisplayName;
                            existingRecord.Enabled = model.ContactEntry.Enabled;
                            existingRecord.UserId = model.ContactEntry.UserId;
                        }
                    }
                    await _context.SaveChangesAsync();
                } catch(DbUpdateException ex)
                {
                    _logger.LogError(ex, "Version contact edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
                    //Refresh the available users list
                    model.ListOfUsers = await _repository.GetUsers();
                    return View(model);
                }
                TempData["Message"] = "Version contact updated";
                TempData["MessageType"] = "success";
                return RedirectToAction("ContactAlert", new { Id = model.ContactEntry.VersionId });
            }
            //Refresh the available users list
            model.ListOfUsers = await _repository.GetUsers();
            return View(model);
        }

        // GET: Version/EditContact/1?VersionContactId=1
        public async Task<IActionResult> EditContact(int id, int VersionContactId)
        {
            VersionAddContactModel ViewModel = new()
            {
                ContactEntry = _context.VersionContact.FirstOrDefault(u => u.VersionId == id && u.VersionContactId == VersionContactId),
                ListOfUsers = await _repository.GetUsers()
            };
            return View("AddContact", ViewModel);
        }

        // GET: Version/DeleteContact/1?VersionContactId=1
        public async Task<IActionResult> DeleteContact(int id, int VersionContactId)
        {
            var recordToDeleete = _context.VersionContact.FirstOrDefault(u => u.VersionId == id && u.VersionContactId == VersionContactId);
            try
            {
                _context.VersionContact.Remove(recordToDeleete);
                await _context.SaveChangesAsync();
                TempData["Message"] = "Version contact deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction("ContactAlert",new { Id = id});
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Version contact delete failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            return RedirectToAction("ContactAlert", new { Id = id });
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
                TempData["Message"] = "Version deleted";
                TempData["MessageType"] = "success";
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

        private void UpdateVersionBasemaps(int[] selectedBasemaps, int defaultBasemap, Data.Models.Version versionToUpdate)
        {
            if (!selectedBasemaps.Any())
            {
                return;
            }

            var selectedBasemapsHS = new HashSet<int>(selectedBasemaps);
            var versionBasemaps = new HashSet<int>();
            if(selectedBasemaps.Any())
            {
                versionBasemaps = new HashSet<int>(versionToUpdate.VersionBasemaps.Select(c => c.BasemapId));
            }
                
            foreach (var basemap in _context.Basemap)
            {
                if (selectedBasemapsHS.Contains(basemap.Id))
                {
                    if (!versionBasemaps.Contains(basemap.Id))
                    {                        
                        versionToUpdate.VersionBasemaps.Add(new VersionBasemap { 
                            VersionId = versionToUpdate.Id, 
                            BasemapId = basemap.Id, 
                            IsDefault = (basemap.Id == defaultBasemap),
                            DefaultOpacity = 100, 
                            DefaultSaturation = 100 
                        });
                    }
                    else
                    {
                        //update the IsDefault value
                        versionToUpdate.VersionBasemaps
                            .Where(b => b.BasemapId == basemap.Id)
                            .FirstOrDefault()
                            .IsDefault = (basemap.Id == defaultBasemap);

                    }
                }
                else
                {

                    if (versionBasemaps.Contains(basemap.Id))
                    {
                        VersionBasemap versionBasemapToRemove = versionToUpdate.VersionBasemaps.FirstOrDefault(i => i.BasemapId == basemap.Id);
                        _context.Remove(versionBasemapToRemove);
                    }
                }
            }
        }

        private void UpdateVersionCategories(int[] selectedCategories, Data.Models.Version versionToUpdate)
        {
            if (!selectedCategories.Any())
            {
                return;
            }

            var selectedCategoriesHS = new HashSet<int>(selectedCategories);
            var versionCategories = new HashSet<int>();
            if (versionToUpdate.VersionCategories.Any())
            {
                versionCategories = new HashSet<int>(versionToUpdate.VersionCategories.Select(c => c.CategoryId));
            }

            foreach (var category in _context.Category)
            {
                if (selectedCategoriesHS.Contains(category.Id))
                {
                    if (!versionCategories.Contains(category.Id))
                    {
                        versionToUpdate.VersionCategories.Add(new VersionCategory
                        {
                            VersionId = versionToUpdate.Id,
                            CategoryId = category.Id
                        });
                    }
                }
                else
                {

                    if (versionCategories.Contains(category.Id))
                    {
                        VersionCategory versionCategoryToRemove = versionToUpdate.VersionCategories.FirstOrDefault(i => i.CategoryId == category.Id);
                        _context.Remove(versionCategoryToRemove);
                    }
                }
            }
        }

        private void RebuildViewModel(ref Data.Models.ViewModels.Management.VersionEditModel model, Data.Models.Version version)
        {
            var themes = _context.Theme.OrderBy(t => t.Name).ToList();
            var bounds = _context.Bound.OrderBy(t => t.Name).ToList();
            var welcomeMessages = _context.WelcomeMessages.OrderBy(t => t.Name).ToList();
            var tours = _context.TourDetails.OrderBy(t => t.Name).ToList();
            var basemaps = _context.Basemap.OrderBy(b => b.Name).ToList();
            var categories = _context.Category.OrderBy(b => b.Name).ToList();

            model.AvailableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
            model.AvailableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
            model.AvailableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
            model.AvailableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);

            model.AvailableBasemaps = basemaps;
            if (version.VersionBasemaps != null) {
                model.SelectedBasemaps = version.VersionBasemaps.Select(v => v.BasemapId).ToList();
                model.DefaultBasemap = version.VersionBasemaps.Where(v => v.IsDefault == true).Select(v => v.BasemapId).FirstOrDefault();
            }
            model.AvailableCategories = categories;
            if (version.VersionCategories.Any())
            {
                model.SelectedCategories = version.VersionCategories.Select(c => c.CategoryId).ToList();
            }
            ViewData["SelectedCategories"] = model.SelectedCategories;
            ViewData["AllCategories"] = model.AvailableCategories;
        }
    }
}
