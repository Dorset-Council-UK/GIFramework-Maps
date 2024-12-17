using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NodaTime;
using System;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
	[Authorize(Roles = "GIFWAdmin")]
	public class ManagementLayerDisclaimerController(
			ILogger<ManagementLayerDisclaimerController> logger,
			IManagementRepository repository,
			ApplicationDbContext context
			) : Controller
    {
        //dependency injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementLayerDisclaimerController> _logger = logger;
        private readonly IManagementRepository _repository = repository;
        private readonly ApplicationDbContext _context = context;

		// GET: WelcomeMessage
		public async Task<IActionResult> Index()
        {
            var layerDisclaimers = await _repository.GetLayerDisclaimers();
            return View(layerDisclaimers);
        }

        // GET: Layer/Disclaimer/Create
        public IActionResult Create()
        {

			var model = new LayerDisclaimer();
            return View(model);
        }

		//POST: Layer/Disclaimer/Create
		[HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(LayerDisclaimer layerDisclaimer)
        {
            TryValidateModel(layerDisclaimer);
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(layerDisclaimer);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New disclaimer created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Disclaimer creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(layerDisclaimer);
        }

		// GET: Layer/Disclaimer/Edit/1
		public async Task<IActionResult> Edit(int id)
        {
            var layerDisclaimer = await _repository.GetLayerDisclaimerViewModel(id);
			
            if (layerDisclaimer == null)
            {
                return NotFound();
            }

            return View(layerDisclaimer);
        }

		// POST: Layer/Disclaimer/Edit/1
		[HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var layerDisclaimerToUpdate = await _context.LayerDisclaimers.FirstOrDefaultAsync(a => a.Id == id);
            TryValidateModel(layerDisclaimerToUpdate);
            if (ModelState.IsValid)

                if (await TryUpdateModelAsync(
                layerDisclaimerToUpdate,
                "LayerDisclaimer",
                a => a.Name, 
                a => a.Disclaimer, 
                a => a.Frequency, 
                a => a.DismissText))
            {
                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Disclaimer edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Disclaimer edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
			var viewModel =  await _repository.GetLayerDisclaimerViewModel(id);
			viewModel.LayerDisclaimer = layerDisclaimerToUpdate;
			return View(viewModel);
        }

		// GET: Layer/Disclaimer/Delete/1
		public async Task<IActionResult> Delete(int id)
        {
            var layerDisclaimer = await _repository.GetLayerDisclaimerViewModel(id);

            if (layerDisclaimer == null)
            {
                return NotFound();
            }

            return View(layerDisclaimer);
        }

		// POST: Layer/Disclaimer/Delete/1
		[HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var layerDisclaimerToDelete = await _context.LayerDisclaimers.FirstOrDefaultAsync(a => a.Id == id);

                try
                {
                    _context.LayerDisclaimers.Remove(layerDisclaimerToDelete);
                    await _context.SaveChangesAsync();
					TempData["Message"] = "Disclaimer deleted";
					TempData["MessageType"] = "success";
					return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Dislcaimer delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
			var viewModel = await _repository.GetLayerDisclaimerViewModel(id);
			viewModel.LayerDisclaimer = layerDisclaimerToDelete;
			return View(viewModel);
        }
    }
}
