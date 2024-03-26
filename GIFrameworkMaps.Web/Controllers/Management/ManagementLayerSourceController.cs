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
    public class ManagementLayerSourceController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementLayerSourceController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementLayerSourceController(
            ILogger<ManagementLayerSourceController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: LayerSource
        public async Task<IActionResult> Index()
        {
            var layers = await _repository.GetLayerSources();
            return View(layers);
        }

        public async Task<IActionResult> Create()
        {
            var layerSource = new LayerSource();
            var editModel = new LayerSourceEditViewModel();
            editModel = await RebuildViewModel(editModel, layerSource);
            return View(editModel);
        }

        //POST: LayerSource/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(LayerSourceEditViewModel editModel, bool AddOption)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.LayerSource);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New Layer source created";
                    TempData["MessageType"] = "success";
                    if (AddOption)
                    {
                        return RedirectToAction(nameof(CreateOption), new {id= editModel.LayerSource.Id});
                    }
                    else
                    {
                        return RedirectToAction(nameof(Index));
                    }
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Layer source creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            editModel = await RebuildViewModel(editModel, editModel.LayerSource);
            return View(editModel);
        }

        //GET: LayerSource/CreateOption/1
        public async Task<IActionResult> CreateOption(int id)
        {
            var layerSource = await _repository.GetLayerSource(id);

            if (layerSource is null)
            {
                return NotFound();
            }

            var editModel = new LayerSourceOptionEditViewModel()
			{
				LayerSourceOption = new() { LayerSourceId = layerSource.Id },
				LayerSource = layerSource
			};
            return View(editModel);
        }

        //POST: LayerSource/CreateOption
        [HttpPost, ActionName("CreateOption")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateOptionPost(LayerSourceOptionEditViewModel editModel, bool AddAnother)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.LayerSourceOption);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New layer option created";
                    TempData["MessageType"] = "success";
                    if (AddAnother)
                    {
                        return RedirectToAction(nameof(CreateOption), new {id=editModel.LayerSourceOption.LayerSourceId});
                    }
                    else
                    {
                        return RedirectToAction(nameof(Edit), new { id = editModel.LayerSourceOption.LayerSourceId });
                    }
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Layer source creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            //RebuildViewModel(ref editModel, editModel.LayerSource);
            return View(editModel);
        }

        // GET: LayerSource/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var layerSource = await _repository.GetLayerSource(id);

            if (layerSource == null)
            {
                return NotFound();
            }

            var editModel = new LayerSourceEditViewModel { LayerSource = layerSource };
            editModel = await RebuildViewModel(editModel, layerSource);
            return View(editModel);
        }

        // POST: LayerSource/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var sourceToUpdate = await _context.LayerSources.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                sourceToUpdate,
                "LayerSource",
                a => a.Name,
                a => a.Description,
                a => a.AttributionId,
                a => a.LayerSourceTypeId))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Layer source edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Layer source edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(sourceToUpdate);
        }

        // GET: LayerSource/EditOption/1
        public async Task<IActionResult> EditOption(int id)
        {
            var layerSourceOption = await _repository.GetLayerSourceOption(id);
            var layerSource = await _repository.GetLayerSource(layerSourceOption.LayerSourceId);

            if (layerSourceOption == null || layerSource == null)
            {
                return NotFound();
            }

            var editModel = new LayerSourceOptionEditViewModel { LayerSourceOption = layerSourceOption, LayerSource = layerSource };
            return View(editModel);
        }

        // POST: LayerSource/EditOption/1
        [HttpPost, ActionName("EditOption")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditOptionPost(int id)
        {
            var optionToUpdate = await _context.LayerSourceOptions.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                optionToUpdate,
                "LayerSourceOption",
                a => a.Name,
                a => a.Value))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Layer option edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Edit), new { id = optionToUpdate.LayerSourceId });
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Layer source option edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(optionToUpdate);
        }

        // GET: LayerSource/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var layerSource = await _repository.GetLayerSource(id);

            if (layerSource == null)
            {
                return NotFound();
            }

            return View(layerSource);
        }

        // POST: Layer/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var sourceToDelete = await _context.LayerSources.FirstOrDefaultAsync(a => a.Id == id);

            try
            {
                _context.LayerSources.Remove(sourceToDelete);
                await _context.SaveChangesAsync();
                TempData["Message"] = "Layer source deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer source delete failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }

            return View(sourceToDelete);
        }

        // GET: LayerSource/Delete/1
        public async Task<IActionResult> DeleteOption(int id)
        {
            var layerSourceOption = await _repository.GetLayerSourceOption(id);
            var layerSource = await _repository.GetLayerSource(layerSourceOption.LayerSourceId);

            if (layerSourceOption == null || layerSource == null)
            {
                return NotFound();
            }

            var editModel = new LayerSourceOptionEditViewModel { LayerSourceOption = layerSourceOption, LayerSource = layerSource };
            return View(editModel);
        }

        // POST: Layer/Delete/1
        [HttpPost, ActionName("DeleteOption")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteOptionConfirm(int id)
        {
            var optionToDelete = await _context.LayerSourceOptions.FirstOrDefaultAsync(a => a.Id == id);

            try
            {
                _context.LayerSourceOptions.Remove(optionToDelete);
                await _context.SaveChangesAsync();
                TempData["Message"] = "Layer option deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Edit), new {id = optionToDelete.LayerSourceId});
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Layer source option delete failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }

            return View(optionToDelete);
        }

        private async Task<LayerSourceEditViewModel> RebuildViewModel(LayerSourceEditViewModel model, Data.Models.LayerSource layerSource)
        {
            var attributions = _context.Attributions.OrderBy(t => t.Name).ToList();
            var layerSourceTypes = _context.LayerSourceTypes.OrderBy(t => t.Name).ToList();
            if(model.LayerSource != null && model.LayerSource.Id != 0)
            {
                var layers = await _repository.GetLayersByLayerSource(model.LayerSource.Id);
                model.LayersUsingSource = layers;
            }

            model.AvailableAttributions = new SelectList(attributions, "Id", "Name", layerSource.AttributionId);
            model.AvailableLayerSourceTypes = new SelectList(layerSourceTypes, "Id", "Name", layerSource.LayerSourceTypeId);
            return model;
        }
    }
}
