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
    public class ManagementBasemapController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementLayerController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementBasemapController(
            ILogger<ManagementLayerController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Basemap
        public async Task<IActionResult> Index()
        {
            var basemaps  = await _repository.GetBasemaps();
            return View(basemaps);
        }

        public async Task<IActionResult> Create()
        {
            var layerSources = await _repository.GetLayerSources();
            return View(layerSources);
        }

		// GET: Layer/Create/{layerSourceId}
		//      public async Task<IActionResult> CreateFromSource(int id, bool useProxy = false)
		//      {
		//          //get the layer source
		//          var layerSource = await _repository.GetLayerSource(id);

		//          if(layerSource == null)
		//          {
		//              return NotFound();
		//          }
		//          var basemap = new Layer { 
		//              LayerSourceId = id, 
		//              LayerSource = layerSource,
		//              ProxyMapRequests = useProxy,
		//              ProxyMetaRequests = useProxy
		//          };
		//          var editModel = new LayerEditViewModel() { Layer = layer };
		//          await RebuildViewModel(editModel, layer);
		//          return View(editModel);
		//      }

		//      //POST: Layer/Create
		//      [HttpPost, ActionName("CreateFromSource")]
		//      [ValidateAntiForgeryToken]
		//      public async Task<IActionResult> CreatePost(LayerEditViewModel editModel, int[] selectedCategories)
		//      {
		//          if (ModelState.IsValid)
		//          {
		//              try
		//              {
		//                  _context.Add(editModel.Layer);

		//                  foreach(int category in selectedCategories)
		//                  {
		//                      _context.CategoryLayers.Add(new CategoryLayer { CategoryId = category, Layer = editModel.Layer });
		//                  }

		//                  await _context.SaveChangesAsync();
		//                  TempData["Message"] = $"New layer created: {editModel.Layer.Name}";
		//                  TempData["MessageType"] = "success";
		//                  return RedirectToAction(nameof(List));
		//              }
		//              catch (DbUpdateException ex)
		//              {
		//                  _logger.LogError(ex, "Layer creation failed");
		//                  ModelState.AddModelError("", "Unable to save changes. " +
		//                      "Try again, and if the problem persists, " +
		//                      "contact your system administrator.");
		//              }
		//          }
		//          await RebuildViewModel(editModel, editModel.Layer);
		//          return View(editModel);
		//      }

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

		//// GET: Basemap/Delete/1
		//public async Task<IActionResult> Delete(int id)
		//      {
		//          var layer = await _repository.GetLayer(id);

		//          if (layer == null)
		//          {
		//              return NotFound();
		//          }

		//          return View(layer);
		//      }

		//// POST: Basemap/Delete/1
		//[HttpPost, ActionName("Delete")]
		//      [ValidateAntiForgeryToken]
		//      public async Task<IActionResult> DeleteConfirm(int id)
		//      {
		//          var layerToDelete = await _context.Layers.FindAsync(id);

		//          try
		//          {
		//              _context.Layers.Remove(layerToDelete);
		//              await _context.SaveChangesAsync();
		//              TempData["Message"] = "Layer deleted";
		//              TempData["MessageType"] = "success";
		//              return RedirectToAction(nameof(List));
		//          }
		//          catch (DbUpdateException ex)
		//          {
		//              _logger.LogError(ex, "Layer delete failed");
		//              ModelState.AddModelError("", "Unable to save changes. " +
		//                  "Try again, and if the problem persists, " +
		//                  "contact your system administrator.");
		//          }

		//          return View(layerToDelete);
		//      }

		//     private async Task UpdateCategoryLayers(int[] selectedCategories, Layer layerToUpdate)
		//     {
		//         if (selectedCategories == null)
		//         {
		//             await _context.CategoryLayers.Where(c => c.LayerId == layerToUpdate.Id).ExecuteDeleteAsync();    
		//             return;
		//         }

		//         //delete category layers not needed anymore
		//         await _context.CategoryLayers.Where(c => c.LayerId == layerToUpdate.Id && !selectedCategories.Contains(c.CategoryId)).ExecuteDeleteAsync();

		//         //add new category layers
		//         foreach (int category in selectedCategories)
		//         {
		//             if (!_context.CategoryLayers.Where(c => c.LayerId == layerToUpdate.Id && c.CategoryId == category).Any())
		//             {
		//                 await _context.CategoryLayers.AddAsync(new CategoryLayer { CategoryId = category, Layer = layerToUpdate });
		//             }
		//         }
		//         return;

		//     }

		private void RebuildViewModel(BasemapEditViewModel model, Basemap basemap)
		{
			var bounds = _context.Bounds
			   .AsNoTracking()
			   .OrderBy(o => o.Name);

			model.AvailableBounds = new SelectList(bounds, "Id", "Name", basemap.BoundId);
		}
	}
}
