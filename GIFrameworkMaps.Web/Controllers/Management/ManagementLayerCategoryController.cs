using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.ViewModels.Management;
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
    public class ManagementLayerCategoryController(ILogger<ManagementLayerCategoryController> logger, IManagementRepository repository, ApplicationDbContext context) : Controller
    {
        //dependency injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementLayerCategoryController> _logger = logger;
        private readonly IManagementRepository _repository = repository;
        private readonly ApplicationDbContext _context = context;

		public async Task<IActionResult> Index()
        {
            var categories = await _context.Categories
				.AsNoTracking()
				.Include(o => o.ParentCategory)
				.ToListAsync();

			return View(categories);
        }

        public async Task<IActionResult> Create()
        {
            var editModel = new CategoryEditViewModel() { Category = new() };
			await RebuildViewModel(editModel, editModel.Category);
            return View(editModel);
        }

        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(CategoryEditViewModel editModel, int[] selectedLayers)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.Category);
                    UpdateCategoryLayers(selectedLayers, editModel.Category);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New layer category created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Layer Category creation failed");
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                }
            }

            editModel = new CategoryEditViewModel() { Category = editModel.Category };
            await RebuildViewModel(editModel, editModel.Category);
            return View(editModel);
        }

        public async Task<IActionResult> Edit(int id)
        {
            var category = await _context.Categories
				.AsNoTracking()
				.Include(o => o.ParentCategory)
				.Include(o => o.Layers)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (category is null)
            {
                return NotFound();
            }

            var editModel = new CategoryEditViewModel() { Category = category };
            await RebuildViewModel(editModel, editModel.Category);
            return View(editModel);
        }

        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id, int[] selectedLayers)
        {
            var categoryToUpdate = await _context.Categories
				.Include(o => o.ParentCategory)
                .FirstOrDefaultAsync(o => o.Id == id);

            var editModel = new CategoryEditViewModel() { Category = categoryToUpdate };

            if (await TryUpdateModelAsync(
                editModel.Category,
                "Category",
                a => a.Name,
                a => a.Description,
                a => a.Order,
                a => a.ParentCategoryId
                ))
            {
                try
                {
                    UpdateCategoryLayers(selectedLayers, categoryToUpdate);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Layer category edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Layer Category edit failed");
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                }
            }
            
            await RebuildViewModel(editModel, categoryToUpdate);
            return View(editModel);
        }

        public async Task<IActionResult> Delete(int id)
        {
            var category = await _context.Categories.FindAsync(id);

			if (category == null)
            {
                return NotFound();
            }

            return View(category);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var categoryToDelete = await _context.Categories.FindAsync(id);
            try
            {
                _context.Categories.Remove(categoryToDelete);
                await _context.SaveChangesAsync();
                TempData["Message"] = "Layer category deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer Category delete failed");
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
            }
            return View(categoryToDelete);
        }

        private void UpdateCategoryLayers(int[] selectedLayers, Category categoryToUpdate)
        {
			if(selectedLayers.Length == 0)
			{
				//get rid of all layers in the category early and exit
				var categoryLayersToRemove = _context.CategoryLayers.Where(cl => cl.CategoryId == categoryToUpdate.Id);
				_context.RemoveRange(categoryLayersToRemove);
				return;
			}
			//figure out what to add and what to remove
            var selectedCategoriesHS = new HashSet<int>(selectedLayers);
            var versionCategories = new HashSet<int>();
            if (categoryToUpdate.Layers.Count != 0)
            {
                versionCategories = new HashSet<int>(categoryToUpdate.Layers.Select(c => c.LayerId));
            }

            foreach (var layer in _context.Layers)
            {
                if (selectedCategoriesHS.Contains(layer.Id))
                {
                    if (!versionCategories.Contains(layer.Id))
                    {                        
                        categoryToUpdate.Layers.Add(new CategoryLayer
                        {
                            CategoryId = categoryToUpdate.Id,
                            LayerId = layer.Id
                        });
                    }
                }
                else
                {

                    if (versionCategories.Contains(layer.Id))
                    {
                        CategoryLayer categoryLayerToRemove = categoryToUpdate.Layers.FirstOrDefault(i => i.LayerId == layer.Id);
                        _context.Remove(categoryLayerToRemove);
                    }
                }
            }
        }

		private async Task RebuildViewModel(CategoryEditViewModel model, Category category)
		{
			// Note: only call ToList at the last possible moment, allowing Entity Framework to work out the best optimisations

			var parentCategories = _context.Categories
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Where(o => o.Id != category.Id)
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name);

			var layers = _context.Layers
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name);

			var selectedLayerIds = category.Layers.Select(cl => cl.LayerId);

			var availableLayers = await layers
				.Select(o => new SelectListItem()
				{
					Text = o.Name,
					Value = o.Id.ToString(),
					Selected = selectedLayerIds.Contains(o.Id)
				})
				.ToListAsync();

			model.AvailableParentCategories = new SelectList(parentCategories, "Id", "Name", category.ParentCategoryId);
			model.AvailableLayers = availableLayers;
			model.SelectedLayers = selectedLayerIds.ToList();
			model.VersionsCategoryAppearsIn = await _repository.GetVersionsLayerCategoriesAppearIn([model.Category.Id]);

			ViewData["SelectedLayers"] = model.SelectedLayers;
		}
    }
}
