using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
	[Authorize(Roles = "GIFWAdmin")]
    public class ManagementTourStepController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementTourStepController> _logger;
        private readonly ApplicationDbContext _context;

		public ManagementTourStepController(ILogger<ManagementTourStepController> logger, ApplicationDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        // GET: TourStep/Create?tourId=1
        public async Task<IActionResult> Create(int tourId)
        {
			var tourDetail = await _context.TourDetails.FindAsync(tourId);
            if(tourDetail is null)
            {
                return NotFound();
            }

			var nextStep = tourDetail.Steps.Count == 0 ? 1 : tourDetail.Steps.Max(s => s.StepNumber) + 1;
            var step = new TourStep {
				TourDetailId = tourDetail.Id,
				StepNumber = nextStep
			};
            return View(step);
        }
		 
        //POST: TourStep/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(TourStep step, bool addAnother)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.TourSteps.Add(step);
                    await _context.SaveChangesAsync();

                    TempData["Message"] = "New tour step created";
                    TempData["MessageType"] = "success";

					return addAnother
						? RedirectToAction("Create", new { tourId = step.TourDetailId })
						: RedirectToAction("Edit", "ManagementTour", new { id = step.TourDetailId });
				}
				catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Tour step creation failed");
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                }
            }
            return View(step);
        }

        // GET: TourStep/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var step = await _context.TourSteps.FindAsync(id);

			if (step is null)
            {
                return NotFound();
            }

            return View(step);
        }

        // POST: TourStep/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var stepToUpdate = await _context.TourSteps.FindAsync(id);

            if (await TryUpdateModelAsync(
                stepToUpdate,
                "",
                a => a.Title, 
                a => a.Content, 
                a => a.AttachToSelector,
                a => a.AttachToPosition,
                a => a.StepNumber,
                a => a.TourDetailId))
            {
                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Tour step edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction("Edit", "ManagementTour",new {id=stepToUpdate.TourDetailId});
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Tour step edit failed");
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
                }
            }
            return View(stepToUpdate);
        }

        // GET: TourStep/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var step = await _context.TourSteps.FindAsync(id);

			if (step is null)
            {
                return NotFound();
            }

            return View(step);
        }

        // POST: TourStep/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var stepToDelete = await _context.TourSteps.FindAsync(id);
            var redirectTo = stepToDelete.TourDetailId;
            try
            {
                _context.TourSteps.Remove(stepToDelete);
                await _context.SaveChangesAsync();

                TempData["Message"] = "Tour step deleted";
                TempData["MessageType"] = "success";

                return RedirectToAction("Edit", "ManagementTour", new { id = redirectTo });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Tour step delete failed");
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
            }

            return View(stepToDelete);
        }
    }
}
