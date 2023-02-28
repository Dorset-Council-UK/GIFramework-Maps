using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Drawing.Printing;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;

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

        public IActionResult Create()
        {
            var layerSource = new LayerSource();
            var editModel = new LayerSourceEditModel();
            RebuildViewModel(ref editModel, layerSource);
            return View(editModel);
        }

        //POST: LayerSource/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(LayerSourceEditModel editModel, bool AddOption)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.LayerSource);
                    await _context.SaveChangesAsync();
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
            RebuildViewModel(ref editModel, editModel.LayerSource);
            return View(editModel);
        }

        //GET: LayerSource/CreateOption/1
        public async Task<IActionResult> CreateOption(int id)
        {
            var layerSource = await _repository.GetLayerSource(id);

            if (layerSource == null)
            {
                return NotFound();
            }

            LayerSourceOption opt = new LayerSourceOption { LayerSourceId = layerSource.Id};
            var editModel = new LayerSourceOptionEditModel { LayerSourceOption=opt, LayerSource = layerSource };
            return View(editModel);
        }

        //POST: LayerSource/CreateOption
        [HttpPost, ActionName("CreateOption")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateOptionPost(LayerSourceOptionEditModel editModel, bool AddAnother)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(editModel.LayerSourceOption);
                    await _context.SaveChangesAsync();
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

            var editModel = new LayerSourceEditModel { LayerSource = layerSource };
            RebuildViewModel(ref editModel, layerSource);
            return View(editModel);
        }

        // POST: LayerSource/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var sourceToUpdate = await _context.LayerSource.FirstOrDefaultAsync(a => a.Id == id);

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

            var editModel = new LayerSourceOptionEditModel { LayerSourceOption = layerSourceOption, LayerSource = layerSource };
            return View(editModel);
        }

        // POST: LayerSource/EditOption/1
        [HttpPost, ActionName("EditOption")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditOptionPost(int id)
        {
            var optionToUpdate = await _context.LayerSourceOption.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                optionToUpdate,
                "LayerSourceOption",
                a => a.Name,
                a => a.Value))
            {

                try
                {
                    await _context.SaveChangesAsync();
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
            var sourceToDelete = await _context.LayerSource.FirstOrDefaultAsync(a => a.Id == id);

            try
            {
                _context.LayerSource.Remove(sourceToDelete);
                await _context.SaveChangesAsync();
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

            var editModel = new LayerSourceOptionEditModel { LayerSourceOption = layerSourceOption, LayerSource = layerSource };
            return View(editModel);
        }

        // POST: Layer/Delete/1
        [HttpPost, ActionName("DeleteOption")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteOptionConfirm(int id)
        {
            var optionToDelete = await _context.LayerSourceOption.FirstOrDefaultAsync(a => a.Id == id);

            try
            {
                _context.LayerSourceOption.Remove(optionToDelete);
                await _context.SaveChangesAsync();
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

        private void RebuildViewModel(ref Data.Models.ViewModels.Management.LayerSourceEditModel model, Data.Models.LayerSource layerSource)
        {
            var attributions = _context.Attribution.OrderBy(t => t.Name).ToList();
            var layerSourceTypes = _context.LayerSourceType.OrderBy(t => t.Name).ToList();

            model.AvailableAttributions = new SelectList(attributions, "Id", "Name", layerSource.AttributionId);
            model.AvailableLayerSourceTypes = new SelectList(layerSourceTypes, "Id", "Name", layerSource.LayerSourceTypeId);
        }

    }
}
