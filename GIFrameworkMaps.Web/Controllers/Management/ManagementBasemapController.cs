using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
	[Authorize(Roles = "GIFWAdmin")]
    public class ManagementBasemapController(
			ILogger<ManagementLayerController> logger,
			IManagementRepository repository,
			ApplicationDbContext context
			) : Controller
    {
        //dependency injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementLayerController> _logger = logger;
        private readonly IManagementRepository _repository = repository;
        private readonly ApplicationDbContext _context = context;

		// GET: Basemap
		public async Task<IActionResult> Index()
        {
            var basemaps  = await _repository.GetBasemaps();
            return View(basemaps);
        }

		// GET: Basemap/Create
		public async Task<IActionResult> Create()
        {
            var layerSources = await _repository.GetLayerSources();
            return View(layerSources);
        }

		// GET: Basemap/Create/{layerSourceId}
		public async Task<IActionResult> CreateFromSource(int id)
		{
			//get the layer source
			var layerSource = await _repository.GetLayerSource(id);

			if (layerSource == null)
			{
				return NotFound();
			}
			var basemap = new Basemap
			{
				LayerSourceId = id,
				LayerSource = layerSource,
				MaxZoom = 20
			};
			var editModel = new BasemapEditViewModel() { Basemap = basemap };
			RebuildViewModel(editModel, basemap);
			return View(editModel);
		}

		//POST: Basemap/Create
		[HttpPost, ActionName("CreateFromSource")]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> CreatePost(BasemapEditViewModel editModel, int[] selectedCategories)
		{
			if (ModelState.IsValid)
			{
				try
				{
					_context.Add(editModel.Basemap);

					await _context.SaveChangesAsync();
					TempData["Message"] = $"New basemap created: {editModel.Basemap.Name}";
					TempData["MessageType"] = "success";
					return RedirectToAction(nameof(Index));
				}
				catch (DbUpdateException ex)
				{
					_logger.LogError(ex, "Layer creation failed");
					ModelState.AddModelError("", "Unable to save changes. " +
						"Try again, and if the problem persists, " +
						"contact your system administrator.");
				}
			}
			RebuildViewModel(editModel, editModel.Basemap);
			return View(editModel);
		}

		// GET: Basemap/Edit/1
		public async Task<IActionResult> Edit(int id)
		{
			var basemap = await _repository.GetBasemap(id);

			if (basemap == null)
			{
				return NotFound();
			}
			var editModel = new BasemapEditViewModel { Basemap = basemap };

			RebuildViewModel(editModel, basemap);
			return View(editModel);
		}

		// POST: Basemap/Edit/1
		[HttpPost, ActionName("Edit")]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> EditPost(int id)
		{
			var basemapToUpdate = await _context.Basemaps.FindAsync(id);

			if (await TryUpdateModelAsync(
				basemapToUpdate,
				"Basemap",
				a => a.Name,
				a => a.BoundId,
				a => a.MaxZoom,
				a => a.MinZoom,
				a => a.PreviewImageURL))
			{

				try
				{
					await _context.SaveChangesAsync();
					TempData["Message"] = $"Basemap edited: {basemapToUpdate.Name}";
					TempData["MessageType"] = "success";
					return RedirectToAction(nameof(Index));
				}
				catch (DbUpdateException ex)
				{
					_logger.LogError(ex, "Basemap edit failed");
					ModelState.AddModelError("", "Unable to save changes. " +
						"Try again, and if the problem persists, " +
						"contact your system administrator.");
				}
			}
			basemapToUpdate.LayerSource = await _repository.GetLayerSource(basemapToUpdate.LayerSourceId);
			var editModel = new BasemapEditViewModel { Basemap = basemapToUpdate };
			RebuildViewModel(editModel, basemapToUpdate);
			return View(editModel);
		}

		// GET: Basemap/Delete/1
		public async Task<IActionResult> Delete(int id)
		{
			var basemap = await _repository.GetBasemap(id);

			if (basemap == null)
			{
				return NotFound();
			}

			return View(basemap);
		}

		// POST: Basemap/Delete/1
		[HttpPost, ActionName("Delete")]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> DeleteConfirm(int id)
		{
			var basemapToDelete = await _context.Basemaps.FindAsync(id);

			try
			{
				_context.Basemaps.Remove(basemapToDelete);
				await _context.SaveChangesAsync();
				TempData["Message"] = "Basemap deleted";
				TempData["MessageType"] = "success";
				return RedirectToAction(nameof(Index));
			}
			catch (DbUpdateException ex)
			{
				_logger.LogError(ex, "Basemap delete failed");
				ModelState.AddModelError("", "Unable to save changes. " +
					"Try again, and if the problem persists, " +
					"contact your system administrator.");
			}

			return View(basemapToDelete);
		}

		private void RebuildViewModel(BasemapEditViewModel model, Basemap basemap)
		{
			var bounds = _context.Bounds
			   .AsNoTracking()
			   .OrderBy(o => o.Name);

			model.AvailableBounds = new SelectList(bounds, "Id", "Name", basemap.BoundId);
		}
	}
}
