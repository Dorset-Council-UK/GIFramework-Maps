using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NodaTime;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementTourController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementTourController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementTourController(
            ILogger<ManagementTourController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Tour
        public async Task<IActionResult> Index()
        {
            var tours = await _repository.GetTours();
            return View(tours);
        }

        // GET: Tour/Create
        public IActionResult Create()
        {
            Instant now = SystemClock.Instance.GetCurrentInstant();
            DateTimeZone tz = DateTimeZoneProviders.Tzdb.GetSystemDefault();
            ZonedDateTime zdt = now.InZone(tz);
            //default the update date to now
            var model = new TourDetail() { UpdateDate = zdt.LocalDateTime };
            return View(model);
        }

        //POST: Tour/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(TourDetail tour, bool AddStep, DateTime UpdateDate)
        {
            tour.UpdateDate = LocalDateTime.FromDateTime(UpdateDate);
            ModelState.Clear();
            TryValidateModel(tour);
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(tour);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New tour created";
                    TempData["MessageType"] = "success";
                    if (AddStep)
                    {
                        return RedirectToAction("Create", "ManagementTourStep", new { tourId = tour.Id });
                    }
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Tour creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }

            return View(tour);
        }

        // GET: Tour/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var tour = await _repository.GetTour(id);

            if (tour == null)
            {
                return NotFound();
            }

            return View(tour);
        }

        // POST: Tour/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id, DateTime UpdateDate)
        {
            var tourToUpdate = await _context.TourDetails.FirstOrDefaultAsync(a => a.Id == id);
            tourToUpdate.UpdateDate = LocalDateTime.FromDateTime(UpdateDate);
            ModelState.Clear();
            TryValidateModel(tourToUpdate);
            if (await TryUpdateModelAsync(
                tourToUpdate,
                "",
                a => a.Name,
                a => a.Frequency,
                a => a.Steps))
            {
                LocalDateTime formattedUpdateDateTime = LocalDateTime.FromDateTime(UpdateDate);

                tourToUpdate.UpdateDate = formattedUpdateDateTime;
                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Tour edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Tour edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            tourToUpdate.Steps = await _context.TourSteps.Where(a => a.TourDetailId == id).ToListAsync();
            return View(tourToUpdate);
        }

        // GET: Tour/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var tour = await _repository.GetTour(id);

            if (tour == null)
            {
                return NotFound();
            }

            return View(tour);
        }

        // POST: Tour/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var tourToDelete = await _context.TourDetails.FirstOrDefaultAsync(a => a.Id == id);

                try
                {
                    _context.TourDetails.Remove(tourToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = "Tour deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Tour delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }

            return View(tourToDelete);
        }
    }
}
