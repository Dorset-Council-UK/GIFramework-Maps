using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
	[Authorize(Roles = "GIFWAdmin")]
    public class ManagementVersionController(
	  ILogger<ManagementVersionController> logger,
	  IManagementRepository repository,
	  ICommonRepository commonRepository,
	  ApplicationDbContext context,
	  IConfiguration configuration
	) : Controller
    {
        //dependency injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementVersionController> _logger = logger;
        private readonly IManagementRepository _repository = repository;
		private readonly ICommonRepository _commonRepository = commonRepository;
        private readonly ApplicationDbContext _context = context;

		// GET: Version
		public async Task<IActionResult> Index()
        {
            var versions = await _commonRepository.GetVersions();
            return View(versions);
        }

        // GET: Version/Create
        public async Task<IActionResult> Create()
        {
            var editModel = new VersionEditViewModel() { Version = new() };
			await RebuildViewModel(editModel, editModel.Version);
            return View(editModel);
        }

        //POST: Version/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(VersionEditViewModel editModel, 
            int[] selectedBasemaps, 
            int defaultBasemap,
			int[] selectedProjections,
			int mapProjection,
			int viewProjection,
			int[] selectedCategories,
            bool purgeCache)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.Version);
                    UpdateVersionBasemaps(selectedBasemaps, defaultBasemap, editModel.Version);
					UpdateVersionProjections(selectedProjections, mapProjection, viewProjection, editModel.Version);
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
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                }
            }

            editModel = new VersionEditViewModel() { Version = editModel.Version };
			await RebuildViewModel(editModel, editModel.Version);
            return View(editModel);
        }

        // GET: Version/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
			var version = await _context.Versions
				.AsSplitQuery()
				.Include(v => v.VersionBasemaps)
					.ThenInclude(v => v.Basemap)
				.Include(v => v.VersionCategories)
					.ThenInclude(v => v.Category)
				.Include(v => v.VersionProjections)
					.ThenInclude(v => v.Projection)
				.FirstOrDefaultAsync(v => v.Id == id);

			if (version is null)
            {
                return NotFound();
            }

            var editModel = new VersionEditViewModel() { Version = version };
			await RebuildViewModel(editModel, editModel.Version);

            return View(editModel);
        }

        // POST: Version/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id, 
            int[] selectedBasemaps, 
            int defaultBasemap,
			int[] selectedProjections,
			int mapProjection,
			int viewProjection,
			int[] selectedCategories,
            bool purgeCache)
        {
			var versionToUpdate = await _context.Versions
				.AsSplitQuery()
				.Include(v => v.VersionBasemaps)
                    .ThenInclude(v => v.Basemap)
				.Include(v => v.VersionProjections)
					.ThenInclude(v => v.Projection)
				.Include(v => v.VersionCategories)
                    .ThenInclude(v => v.Category)
                .FirstOrDefaultAsync(v => v.Id == id);
            var editModel = new VersionEditViewModel() { Version = versionToUpdate };

            if (await TryUpdateModelAsync(
                editModel.Version,
                "Version",
                a => a.Name,
                a => a.Slug,
                a => a.Description,
				a => a.VersionNotes,
                a => a.Enabled,
                a => a.RequireLogin,
                a => a.ShowLogin,
				a => a.FeaturedVersion,
				a => a.Hidden,
                a => a.HelpURL,
                a => a.FeedbackURL,
                a => a.RedirectionURL,
				a => a.VersionImageURL,
                a => a.ThemeId,
                a => a.BoundId,
                a => a.WelcomeMessageId,
                a => a.TourDetailsId,
				a => a.AttributionId
                ))
            {
                try
                {
                    UpdateVersionBasemaps(selectedBasemaps, defaultBasemap, versionToUpdate);
					UpdateVersionProjections(selectedProjections, mapProjection, viewProjection, versionToUpdate);
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
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                }
            }

			await RebuildViewModel(editModel, versionToUpdate);
			return View(editModel);
        }

		// GET: Version/EditContacts/1
		public async Task<IActionResult> EditContacts(int id)
        {
            try
            {
                var version = await _context.Versions
					.AsNoTracking()
					.IgnoreAutoIncludes()
					.Include(v => v.VersionContacts)
                    .FirstOrDefaultAsync(v => v.Id == id);

                if (version is null)
                {
                    return NotFound();
                }
                var editModel = new VersionEditContactViewModel() { VersionId = version.Id, VersionName = version.Name };
				editModel.Contacts = await _context.VersionContacts.Where(v => v.VersionId == version.Id).ToArrayAsync();
                return View(editModel);
            } catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "We were unable to load the contacts for this version");
                ModelState.AddModelError("", "We were unable to load the contacts for this version. Try again, and if the problem persists, contact your system administrator.");
                return RedirectToAction("Edit", new { Id = id });
            }
        }

        // GET: Version/AddContact/1
        public async Task<IActionResult> AddContact(int id)
        {
            VersionAddContactViewModel ViewModel = new()
            {
                ContactEntry = new VersionContact { VersionId = id, VersionContactId = -1 },
                ListOfUsers = await _repository.GetUsers()
            };
            return View(ViewModel);
        }

        // POST: Version/AddContact
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddContact(VersionAddContactViewModel model)
        {
            if (ModelState.IsValid)
            {
                //Save the record
                try
                {
                    if (model.ContactEntry.VersionContactId == -1)
                    {
                        //This is a new record
                        _context.VersionContacts.Add(new VersionContact
                        {
                            DisplayName = model.ContactEntry.DisplayName,
                            Enabled = model.ContactEntry.Enabled,
                            UserId = model.ContactEntry.UserId,
                            VersionId = model.ContactEntry.VersionId,
							Email = model.ContactEntry.Email,
                        });
                    }
                    else
                    {
                        var existingRecord = await _context.VersionContacts
							.FirstOrDefaultAsync(o => o.VersionContactId == model.ContactEntry.VersionContactId);
                        if (existingRecord is not null)
                        {
                            existingRecord.DisplayName = model.ContactEntry.DisplayName;
                            existingRecord.Enabled = model.ContactEntry.Enabled;
                            existingRecord.UserId = model.ContactEntry.UserId;
							existingRecord.Email = model.ContactEntry.Email;
						}
						_context.Update(existingRecord);
                    }
                    await _context.SaveChangesAsync();
                }
				catch(DbUpdateException ex)
                {
                    _logger.LogError(ex, "Version contact edit failed");
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
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
			var versionContact = await _context.VersionContacts.FindAsync([VersionContactId, id]);

			VersionAddContactViewModel ViewModel = new()
            {
                ContactEntry = _context.VersionContacts.FirstOrDefault(u => u.VersionId == id && u.VersionContactId == VersionContactId),
                ListOfUsers = await _repository.GetUsers()
            };
            return View("AddContact", ViewModel);
        }

        // GET: Version/DeleteContact/1?VersionContactId=1
        public async Task<IActionResult> DeleteContact(int id, int VersionContactId)
        {
            var recordToDelete = await _context.VersionContacts.FindAsync([VersionContactId, id]);
			try
            {
                _context.VersionContacts.Remove(recordToDelete);
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
            var version = await _commonRepository.GetVersion(id);

			if (version is null)
			{
				TempData["Message"] = "Version not found";
				TempData["MessageType"] = "danger";
				return RedirectToAction("Edit", new { Id = id });
			}

			version.VersionLayerCustomisations = await _context.VersionLayers
				.Include(r => r.Layer)
                .Include(r => r.Category)
                .Where(r => r.VersionId == version.Id)
                .AsNoTrackingWithIdentityResolution()
                .ToListAsync();

            return View(version);
        }

        // GET Version/EditLayerCustomisation/123?layerId=234&categoryId=345
        public async Task<IActionResult> EditLayerCustomisation(int id, int layerId, int categoryId)
        {
            //get the layer details and any existing customisations
            var version = await _commonRepository.GetVersion(id);
            var layer = await _repository.GetLayer(layerId);
            var category = await _repository.GetLayerCategory(categoryId);
            //TODO - fetch this as part of the above?
            var customisation = await _context.VersionLayers
				.Include(r => r.Layer)
				.Where(r => r.VersionId == version.Id && r.LayerId == layerId && r.CategoryId == categoryId)
				.FirstOrDefaultAsync();

            var viewModel = new CustomiseLayerEditViewModel()
			{
				Layer = layer,
				Version = version,
				Category = category,
				LayerCustomisation = customisation
			};

            return View(viewModel);
        }

        // POST: Version/EditLayerCustomisation
        [HttpPost, ActionName("EditLayerCustomisation")]
		[ValidateAntiForgeryToken]
        public async Task<IActionResult> EditLayerCustomisationPost(CustomiseLayerEditViewModel model)
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
                        ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                    }
                }
            }
            else
            {
                //edit
				var customisationToUpdate = await _context.VersionLayers.FindAsync(model.LayerCustomisation.Id);

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
                        ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                    }
                }
            }

            var version = await _commonRepository.GetVersion(model.Version.Id);
            var layer = await _repository.GetLayer(model.Layer.Id);
            var category = await _repository.GetLayerCategory(model.Category.Id);
            var viewModel = new CustomiseLayerEditViewModel()
			{
				Layer = layer,
				Version = version,
				Category = category,
				LayerCustomisation = model.LayerCustomisation
			};

            return View(viewModel);

        }

        // GET: Version/DeleteLayerCustomisation/123
        public async Task<IActionResult> DeleteLayerCustomisation(int id)
        {
            var customisation = await _context.VersionLayers
				.Include(r => r.Layer)
				.Include(r => r.Category)
				.Where(r => r.Id == id)
				.FirstOrDefaultAsync();
            return View(customisation);
        }

        // POST: Version/DeleteLayerCustomisation/123
        [HttpPost, ActionName("DeleteLayerCustomisation")]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> DeleteLayerCustomisationPost(int id)
        {
			var customisation = await _context.VersionLayers.FindAsync(id);
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
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
            }
            return View(customisation);
        }

        // GET Version/RemoveAllCustomisations/1
        public async Task<IActionResult> RemoveAllCustomisations(int id)
        {
            var version = await _commonRepository.GetVersion(id);
			if (version is null)
			{
				TempData["Message"] = "Version could not be found";
				TempData["MessageType"] = "danger";
				return RedirectToAction("Index");
			}

            return View(version);
        }
        // POST Version/RemoveAllCustomisations/1
        [HttpPost, ActionName("RemoveAllCustomisations")]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> RemoveAllCustomisationsPost(int id)
        {
            try
            {
                await _context.VersionLayers.Where(r => r.VersionId == id).ExecuteDeleteAsync();
                await _context.SaveChangesAsync();
                TempData["Message"] = "Customisations removed";
                TempData["MessageType"] = "success";
                return RedirectToAction("Edit", new { id });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer customisation removal failed");
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
            }
            var version = await _commonRepository.GetVersion(id);
            return View(version);
        }

        // GET: Version/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var version = await _commonRepository.GetVersion(id);

            if (version is null)
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
			var versionToDelete = await _context.Versions.FindAsync(id);

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
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
            }

            return View(versionToDelete);
        }

        private void UpdateVersionBasemaps(int[] selectedBasemaps, int defaultBasemap, Data.Models.Version versionToUpdate)
        {
            if (selectedBasemaps.Length == 0)
            {
                versionToUpdate.VersionBasemaps = [];
                return;
            }

            var selectedBasemapsHS = new HashSet<int>(selectedBasemaps);
            var versionBasemaps = new HashSet<int>();
            if(selectedBasemaps.Length != 0)
            {
                versionBasemaps = new HashSet<int>(versionToUpdate.VersionBasemaps.Select(c => c.BasemapId));
            }
                
            foreach (var basemap in _context.Basemaps)
            {
                if (selectedBasemapsHS.Contains(basemap.Id))
                {
                    if (!versionBasemaps.Contains(basemap.Id))
                    {
                        if (versionToUpdate.VersionBasemaps.Count == 0)
                        {
                            versionToUpdate.VersionBasemaps = [];
                        }
                        versionToUpdate.VersionBasemaps.Add(new VersionBasemap
						{ 
                            VersionId = versionToUpdate.Id, 
                            BasemapId = basemap.Id, 
                            IsDefault = basemap.Id == defaultBasemap,
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
                            .IsDefault = basemap.Id == defaultBasemap;

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

		private void UpdateVersionProjections(int[] selectedProjections, int mapProjection, int viewProjection, Data.Models.Version versionToUpdate)
		{
			if (selectedProjections.Length == 0)
			{
				versionToUpdate.VersionProjections = [];
				return;
			}

			var selectedProjectionsHS = new HashSet<int>(selectedProjections);
			var versionProjections = new HashSet<int>();
			if (selectedProjections.Length != 0)
			{
				versionProjections = new HashSet<int>(versionToUpdate.VersionProjections.Select(c => c.ProjectionId));
			}

			foreach (var projection in _context.Projections)
			{
				if (selectedProjectionsHS.Contains(projection.EPSGCode))
				{
					if (!versionProjections.Contains(projection.EPSGCode))
					{
						if (versionToUpdate.VersionProjections.Count == 0)
						{
							versionToUpdate.VersionProjections = [];
						}
						versionToUpdate.VersionProjections.Add(new VersionProjection
						{
							VersionId = versionToUpdate.Id,
							ProjectionId = projection.EPSGCode,
							IsDefaultViewProjection = viewProjection == projection.EPSGCode,
							IsDefaultMapProjection = mapProjection == projection.EPSGCode
						});
					}
					else
					{
						//update the IsDefault value
						var versionProjectionValue = versionToUpdate.VersionProjections
							.Where(p => p.ProjectionId == projection.EPSGCode)
							.FirstOrDefault();
						versionProjectionValue.IsDefaultMapProjection = projection.EPSGCode == mapProjection;
						versionProjectionValue.IsDefaultViewProjection = projection.EPSGCode == viewProjection;

					}
				}
				else
				{

					if (versionProjections.Contains(projection.EPSGCode))
					{
						VersionProjection versionProjectionToRemove = versionToUpdate.VersionProjections.FirstOrDefault(i => i.ProjectionId == projection.EPSGCode);
						_context.Remove(versionProjectionToRemove);
					}
				}
			}
		}

		private void UpdateVersionCategories(int[] selectedCategories, Data.Models.Version versionToUpdate)
        {
            if (selectedCategories.Length == 0)
            {
				//get rid of all categories in the version early and exit
				_context.RemoveRange(versionToUpdate.VersionCategories);
				return;
            }
			//figure out what to add and remove
            var selectedCategoriesHS = new HashSet<int>(selectedCategories);
            var versionCategories = new HashSet<int>();
            if (versionToUpdate.VersionCategories.Count != 0)
            {
                versionCategories = new HashSet<int>(versionToUpdate.VersionCategories.Select(c => c.CategoryId));
            }

            foreach (var category in _context.Categories)
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

		private async Task RebuildViewModel(VersionEditViewModel model, Data.Models.Version version)
		{
			var themes = await _context.Themes
				.AsNoTracking()
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var bounds = await _context.Bounds
				.AsNoTracking()
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var welcomeMessages = await _context.WelcomeMessages
				.AsNoTracking()
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var tours = await _context.TourDetails
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var attributions = await _context.Attributions
				.AsNoTracking()
				.Select(o => new { o.Id, o.Name})
				.OrderBy(o => o.Name)
				.ToListAsync();

			model.AvailableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
			model.AvailableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
			model.AvailableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
			model.AvailableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);
			model.AvailableAttributions = new SelectList(attributions, "Id", "Name", version.AttributionId);

			// Basemaps
			model.AvailableBasemaps = await _context.Basemaps
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.OrderBy(b => b.Name)
				.ToListAsync();
			model.SelectedBasemaps = version.VersionBasemaps.Select(v => v.BasemapId).ToList();
			model.DefaultBasemap = version.VersionBasemaps.Where(v => v.IsDefault == true).Select(v => v.BasemapId).FirstOrDefault();

			// Projections
			model.AvailableProjections = await _context.Projections
				.AsNoTracking()
				.OrderBy(b => b.Name)
				.ToListAsync();
			var preferredDefaultProjectionString = configuration["GIFrameworkMaps:PreferredProjections"].Split(',').FirstOrDefault()?.Replace("EPSG:", "");
			var preferredDefaultProjection = string.IsNullOrEmpty(preferredDefaultProjectionString)
				? model.AvailableProjections.First()
				: model.AvailableProjections.Where(p => p.EPSGCode == int.Parse(preferredDefaultProjectionString)).FirstOrDefault();

			// Version Projections
			var versionProjections = version.VersionProjections.ToList();
			model.SelectedProjections = versionProjections.Select(v => v.ProjectionId).ToList();
			model.MapProjection = versionProjections.FirstOrDefault(v => v.IsDefaultMapProjection)?.ProjectionId ?? preferredDefaultProjection.EPSGCode;
			model.ViewProjection = versionProjections.FirstOrDefault(v => v.IsDefaultViewProjection)?.ProjectionId ?? preferredDefaultProjection.EPSGCode;

			//switch on the defaults
			model.SelectedProjections.Add(preferredDefaultProjection.EPSGCode);
			model.SelectedProjections.Add(3857);
			model.SelectedProjections.Add(4326);

			// Categories
			model.AvailableCategories = await _context.Categories
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.OrderBy(b => b.Name)
				.ToListAsync();
			if (version.VersionCategories.Count != 0)
			{
				model.SelectedCategories = version.VersionCategories.Select(c => c.CategoryId).ToList();
			}
			ViewData["SelectedCategories"] = model.SelectedCategories;
			ViewData["AllCategories"] = model.AvailableCategories;
		}
    }
}
