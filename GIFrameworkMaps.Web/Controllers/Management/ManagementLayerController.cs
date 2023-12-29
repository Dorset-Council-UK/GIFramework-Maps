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
    public class ManagementLayerController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementLayerController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementLayerController(
            ILogger<ManagementLayerController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Layer
        public IActionResult Index()
        {
            return View();
        }

        // GET: Layer
        public async Task<IActionResult> List()
        {
            var layers  = await _repository.GetLayers();
            return View(layers);
        }

        public async Task<IActionResult> Create()
        {
            var layerSources = await _repository.GetLayerSources();
            return View(layerSources);
        }

        // GET: Layer/Create/{layerSourceId}
        public async Task<IActionResult> CreateFromSource(int id, bool useProxy = false)
        {
            //get the layer source
            var layerSource = await _repository.GetLayerSource(id);

            if(layerSource == null)
            {
                return NotFound();
            }
            var layer = new Layer { 
                LayerSourceId = id, 
                LayerSource = layerSource,
                ProxyMapRequests = useProxy,
                ProxyMetaRequests = useProxy
            };
            LayerEditModel editModel = new() { Layer = layer };
            RebuildViewModel(ref editModel, layer);
            return View(editModel);
        }

        //POST: Layer/Create
        [HttpPost, ActionName("CreateFromSource")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(LayerEditModel editModel, int[] selectedCategories)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.Layer);

                    foreach(int category in selectedCategories)
                    {
                        _context.CategoryLayer.Add(new CategoryLayer { CategoryId = category, Layer = editModel.Layer });
                    }
                    
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"New layer created: {editModel.Layer.Name}";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(List));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Layer creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            RebuildViewModel(ref editModel, editModel.Layer);
            return View(editModel);
        }

        // GET: Layer/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var layer = await _repository.GetLayer(id);

            if (layer == null)
            {
                return NotFound();
            }

            //get categories this layer is in
            var categories = await _repository.GetLayerCategoriesLayerAppearsIn(layer.Id);
            var editModel = new LayerEditModel { Layer = layer, SelectedCategories = categories.Select(c => c.CategoryId).ToList() };
            RebuildViewModel(ref editModel, layer);
            return View(editModel);
        }

        // POST: Layer/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id, int[] selectedCategories)
        {
            var layerToUpdate = await _context.Layer.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                layerToUpdate,
                "Layer",
                a => a.Name,
                a => a.BoundId,
                a => a.MaxZoom,
                a => a.MinZoom,
                a => a.ZIndex,
                a => a.DefaultOpacity,
                a => a.DefaultSaturation,
                a => a.InfoTemplate,
                a => a.InfoListTitleTemplate,
                a => a.Queryable,
                a => a.DefaultFilterEditable,
                a => a.Filterable,
                a => a.ProxyMapRequests,
                a => a.ProxyMetaRequests))
            {

                try
                {
                    await UpdateCategoryLayers(selectedCategories, layerToUpdate);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"Layer edited: {layerToUpdate.Name}";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(List));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Layer edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            layerToUpdate.LayerSource = await _repository.GetLayerSource(layerToUpdate.LayerSourceId);
            var editModel = new LayerEditModel { Layer = layerToUpdate, SelectedCategories = selectedCategories.ToList()};
            RebuildViewModel(ref editModel, layerToUpdate);
            return View(editModel);
        }

        // GET: Layer/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var layer = await _repository.GetLayer(id);

            if (layer == null)
            {
                return NotFound();
            }

            return View(layer);
        }

        // POST: Layer/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var layerToDelete = await _context.Layer.FirstOrDefaultAsync(a => a.Id == id);

            try
            {
                _context.Layer.Remove(layerToDelete);
                await _context.SaveChangesAsync();
                TempData["Message"] = "Layer deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(List));
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer delete failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }

            return View(layerToDelete);
        }

        private async Task UpdateCategoryLayers(int[] selectedCategories, Data.Models.Layer layerToUpdate)
        {
            if (selectedCategories == null)
            {
                await _context.CategoryLayer.Where(c => c.LayerId == layerToUpdate.Id).ExecuteDeleteAsync();    
                return;
            }

            //delete category layers not needed anymore
            await _context.CategoryLayer.Where(c => c.LayerId == layerToUpdate.Id && !selectedCategories.Contains(c.CategoryId)).ExecuteDeleteAsync();

            //add new category layers
            foreach (int category in selectedCategories)
            {
                if (!_context.CategoryLayer.Where(c => c.LayerId == layerToUpdate.Id && c.CategoryId == category).Any())
                {
                    await _context.CategoryLayer.AddAsync(new CategoryLayer { CategoryId = category, Layer = layerToUpdate });
                }

            }
            return;

        }

        private void RebuildViewModel(ref Data.Models.ViewModels.Management.LayerEditModel model, Data.Models.Layer layer)
        {
            var bounds = _context.Bound.OrderBy(t => t.Name).ToList();
            var categories = _context.Category.OrderBy(b => b.Name).ToList();

            model.AvailableBounds = new SelectList(bounds, "Id", "Name", layer.BoundId);
            model.AvailableCategories = categories;
            ViewData["SelectedCategories"] = model.SelectedCategories;
            ViewData["AllCategories"] = model.AvailableCategories;
        }

    }
}
