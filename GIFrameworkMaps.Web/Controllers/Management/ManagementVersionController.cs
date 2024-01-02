using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Data.Common;
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
        private readonly ICommonRepository _commonRepository;
        private readonly ApplicationDbContext _context;
        public ManagementVersionController(
            ILogger<ManagementVersionController> logger,
            IManagementRepository repository,
            ICommonRepository commonRepository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _commonRepository = commonRepository;
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
                .Include(v => v.VersionLayerCustomisations)
                .FirstOrDefaultAsync(v => v.Id == id);

            int[] issueLayers = System.Array.Empty<int>();

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
                    //UpdateVersionLayers(selectedCategories, versionToUpdate, issueLayers);
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

        // GET: Version/EditContacts/1
        public async Task<IActionResult> EditContacts(int id)
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
                editModel.UserDetails = new Dictionary<string, Microsoft.Graph.Beta.Models.User>();
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
                return RedirectToAction(nameof(EditContacts), new { Id = model.ContactEntry.VersionId });
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
                return RedirectToAction(nameof(EditContacts),new { Id = id});
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Version contact delete failed");
				TempData["Message"] = "Version contact delete failed";
				TempData["MessageType"] = "danger";
			}
            return RedirectToAction(nameof(EditContacts), new { Id = id });
        }

        // GET: Version/LayerCustomisation/1
        public async Task<IActionResult> LayerCustomisation(int id)
        {
            //get list of all layers and customisations
            var version = _commonRepository.GetVersion(id);
            //TODO - fetch this as part of the above?
            version.VersionLayerCustomisations = await _context.VersionLayer.
                Include(r => r.Layer)
                .Include(r => r.Category)
                .Where(r => r.VersionId == version.Id)
                .AsNoTrackingWithIdentityResolution()
                .ToListAsync();
            if (version != null)
            {
                return View(version);
            } else
            {
                TempData["Message"] = "Version not found";
                TempData["MessageType"] = "danger";
                return RedirectToAction("Edit", new { Id = id });
            }
        }

        // GET Version/EditLayerCustomisation/123?layerId=234&categoryId=345
        public async Task<IActionResult> EditLayerCustomisation(int id, int layerId, int categoryId)
        {
            //get the layer details and any existing customisations
            var version = _commonRepository.GetVersion(id);
            var layer = await _repository.GetLayer(layerId);
            var category = await _repository.GetLayerCategory(categoryId);
            //TODO - fetch this as part of the above?
            var customisation = await _context.VersionLayer.Include(r => r.Layer).Where(r => r.VersionId == version.Id && r.LayerId == layerId && r.CategoryId == categoryId).FirstOrDefaultAsync();

            var viewModel = new CustomiseLayerEditModel() { Layer = layer, Version = version, Category = category, LayerCustomisation = customisation };

            return View(viewModel);
        }

        // POST: Version/EditLayerCustomisation
        [HttpPost, ActionName("EditLayerCustomisation")]
        public async Task<IActionResult> EditLayerCustomisationPost(CustomiseLayerEditModel model)
        {
            //forces version, layer and category to not be validated
            var skipped = ModelState.Keys.Where(key => key.StartsWith(nameof(model.Version)) || key.StartsWith(nameof(model.Layer)) || key.StartsWith(nameof(model.Category)));
            foreach (var key in skipped)
                ModelState.Remove(key);

            if (model.LayerCustomisation.Id == 0)
            {
                //create
                if (ModelState.IsValid)
                {
                    try
                    {
                        model.LayerCustomisation.LayerId = model.Layer.Id;
                        model.LayerCustomisation.VersionId = model.Version.Id;
                        model.LayerCustomisation.CategoryId = model.Category.Id;
                        _context.Add(model.LayerCustomisation);
                        await _context.SaveChangesAsync();
                        TempData["Message"] = "Customisation saved";
                        TempData["MessageType"] = "success";
                        return RedirectToAction(nameof(LayerCustomisation), new { id = model.Version.Id });
                    }
                    catch (DbUpdateException ex)
                    {
                        _logger.LogError(ex, "Layer customisation failed");
                        ModelState.AddModelError("", "Unable to save changes. " +
                            "Try again, and if the problem persists, " +
                            "contact your system administrator.");
                    }
                }
            }
            else
            {
                //edit
                var customisationToUpdate = await _context.VersionLayer.Where(c => c.Id == model.LayerCustomisation.Id).FirstOrDefaultAsync();

                if (await TryUpdateModelAsync(
                    customisationToUpdate,
                    "LayerCustomisation",
                    a => a.IsDefault,
                    a => a.MaxZoom,
                    a => a.MinZoom,
                    a => a.SortOrder,
                    a => a.DefaultOpacity,
                    a => a.DefaultSaturation
                    ))
                {
                    try
                    {
                        await _context.SaveChangesAsync();
                        TempData["Message"] = "Customisation saved";
                        TempData["MessageType"] = "success";
                        return RedirectToAction(nameof(LayerCustomisation), new { id = model.Version.Id });
                    }
                    catch (DbUpdateException ex)
                    {
                        _logger.LogError(ex, "Layer customisation failed");
                        ModelState.AddModelError("", "Unable to save changes. " +
                            "Try again, and if the problem persists, " +
                            "contact your system administrator.");
                    }
                }
            }

            var version = _commonRepository.GetVersion(model.Version.Id);
            var layer = await _repository.GetLayer(model.Layer.Id);
            var category = await _repository.GetLayerCategory(model.Category.Id);
            var viewModel = new CustomiseLayerEditModel() { Layer = layer, Version = version, Category = category, LayerCustomisation = model.LayerCustomisation };

            return View(viewModel);


        }

        // GET: Version/DeleteLayerCustomisation/123
        public async Task<IActionResult> DeleteLayerCustomisation(int id)
        {
            var customisation = await _context.VersionLayer.Include(r => r.Layer).Include(r => r.Category).Where(r => r.Id == id).FirstOrDefaultAsync();
            return View(customisation);
        }

        // POST: Version/DeleteLayerCustomisation/123
        [HttpPost, ActionName("DeleteLayerCustomisation")]
        public async Task<IActionResult> DeleteLayerCustomisationPost(int id)
        {
            var customisation = await _context.VersionLayer.Where(r => r.Id == id).FirstOrDefaultAsync();
            try
            {
                
                _context.Remove(customisation);
                await _context.SaveChangesAsync();
                TempData["Message"] = "Customisation removed";
                TempData["MessageType"] = "success";
                return RedirectToAction("LayerCustomisation", new { id = customisation.VersionId });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer customisation removal failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            return View(customisation);
        }

        // GET Version/RemoveAllCustomisations/1
        public IActionResult RemoveAllCustomisations(int id)
        {
            var version = _commonRepository.GetVersion(id);
            if (version != null)
            {
                return View(version);
            }
            else
            {
                TempData["Message"] = "Version could not be found";
                TempData["MessageType"] = "danger";
                return RedirectToAction("Index");
            }
        }
        // POST Version/RemoveAllCustomisations/1
        [HttpPost, ActionName("RemoveAllCustomisations")]
        public async Task<IActionResult> RemoveAllCustomisationsPost(int id)
        {
            try
            {
                await _context.VersionLayer.Where(r => r.VersionId == id).ExecuteDeleteAsync();
                await _context.SaveChangesAsync();
                TempData["Message"] = "Customisations removed";
                TempData["MessageType"] = "success";
                return RedirectToAction("Edit", new { id });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer customisation removal failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            var version = _commonRepository.GetVersion(id);
            return View(version);
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
                versionToUpdate.VersionBasemaps = new List<VersionBasemap>();
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
                        if (!versionToUpdate.VersionBasemaps.Any())
                        {
                            versionToUpdate.VersionBasemaps = new List<VersionBasemap>();
                        }
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
