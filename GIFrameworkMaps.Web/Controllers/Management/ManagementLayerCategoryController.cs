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
    public class ManagementLayerCategoryController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementLayerCategoryController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementLayerCategoryController(
            ILogger<ManagementLayerCategoryController> logger,
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
            var attributions = await _repository.GetLayerCategories();
            return View(attributions);
        }

        // GET: Version/Create
        public IActionResult Create()
        {
            var category = new Data.Models.Category();
            var editModel = new CategoryEditModel() { Category = category };
            RebuildViewModel(ref editModel, category);
            return View(editModel);
        }

        //POST: Version/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(CategoryEditModel editModel, int[] selectedLayers)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.Category);
                    UpdateCategoryLayers(selectedLayers, editModel.Category);
                    await _context.SaveChangesAsync();
                    
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Layer Category creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }

            editModel = new CategoryEditModel() { Category = editModel.Category };
            RebuildViewModel(ref editModel, editModel.Category);
            return View(editModel);
        }

        // GET: Version/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var category = await _context.Category
                .Include(c => c.ParentCategory)
                .Include(c => c.Layers)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (category == null)
            {
                return NotFound();
            }
            var editModel = new CategoryEditModel() { Category = category };
            RebuildViewModel(ref editModel, category);
            return View(editModel);
        }

        // POST: Version/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id, int[] selectedLayers)
        {
            var categoryToUpdate = await _context.Category
                .Include(c => c.ParentCategory)
                .Include(c => c.Layers)
                .FirstOrDefaultAsync(v => v.Id == id);

            var editModel = new CategoryEditModel() { Category = categoryToUpdate };

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
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Layer Category edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            
            RebuildViewModel(ref editModel, categoryToUpdate);
            return View(editModel);
        }

        // GET: Version/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var category = await _repository.GetLayerCategory(id);

            if (category == null)
            {
                return NotFound();
            }

            return View(category);
        }

        // POST: Version/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var categoryToDelete = await _context.Category.FirstOrDefaultAsync(a => a.Id == id);
            try
            {
                _context.Category.Remove(categoryToDelete);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer Category delete failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            return View(categoryToDelete);
        }

        private void UpdateCategoryLayers(int[] selectedLayers, Data.Models.Category categoryToUpdate)
        {
            if (selectedLayers == null)
            {
                categoryToUpdate.Layers = new List<CategoryLayer>();
                return;
            }

            var selectedCategoriesHS = new HashSet<int>(selectedLayers);
            var versionCategories = new HashSet<int>();
            if (categoryToUpdate.Layers != null)
            {
                versionCategories = new HashSet<int>(categoryToUpdate.Layers.Select(c => c.LayerId));
            }

            foreach (var layer in _context.Layer)
            {
                if (selectedCategoriesHS.Contains(layer.Id))
                {
                    if (!versionCategories.Contains(layer.Id))
                    {
                        if (categoryToUpdate.Layers == null)
                        {
                            categoryToUpdate.Layers = new List<CategoryLayer>();
                        }
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

        private void RebuildViewModel(ref Data.Models.ViewModels.Management.CategoryEditModel model, Data.Models.Category category)
        {
            
            var categories = _context.Category.Where(c => c.Id != category.Id).OrderBy(t => t.Name).ToList();
            var layers = _context.Layer.OrderBy(l => l.Name).ToList();

            model.AvailableParentCategories = new SelectList(categories, "Id", "Name", category.ParentCategoryId);

            model.AvailableLayers = layers;
            if (category.Layers != null)
            {
                model.SelectedLayers = category.Layers.Select(c => c.LayerId).ToList();
            }
            ViewData["SelectedLayers"] = model.SelectedLayers;
            ViewData["AllLayers"] = model.AvailableLayers;
        }

    }
}
