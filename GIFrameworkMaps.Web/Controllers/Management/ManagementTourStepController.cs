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
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementTourStepController(
            ILogger<ManagementTourStepController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: TourStep/Create?tourId=1
        public IActionResult Create(int tourId)
        {
            var tourDetails = _context.TourDetails.Include(t => t.Steps).FirstOrDefault(t => t.Id == tourId);
            if(tourDetails == null)
            {
                return NotFound();
            }

            var step = new TourStep { TourDetailId = tourDetails.Id, StepNumber = tourDetails.Steps.Count + 1 };
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
                    _context.Add(step);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New tour step created";
                    TempData["MessageType"] = "success";
                    if (addAnother)
                    {
                        return RedirectToAction("Create", new { tourId = step.TourDetailId });
                    }
                    return RedirectToAction("Edit","ManagementTour",new {id=step.TourDetailId});
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Tour step creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(step);
        }

        // GET: TourStep/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var step = await _repository.GetStep(id);

            if (step == null)
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
            var stepToUpdate = await _context.TourSteps.FirstOrDefaultAsync(a => a.Id == id);

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
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Tour step edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(stepToUpdate);
        }

        // GET: TourStep/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var step = await _repository.GetStep(id);

            if (step == null)
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
            var stepToDelete = await _context.TourSteps.FirstOrDefaultAsync(a => a.Id == id);
            var redirectTo = stepToDelete.TourDetailId;
                try
                {
                    _context.TourSteps.Remove(stepToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = "Tour step deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction("Edit","ManagementTour",new {id=redirectTo});
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Tour step delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }

            return View(stepToDelete);
        }
    }
}
