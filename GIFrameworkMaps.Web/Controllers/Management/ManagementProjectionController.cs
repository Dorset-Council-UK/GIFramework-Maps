using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementProjectionController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementProjectionController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementProjectionController(
            ILogger<ManagementProjectionController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Projection
        public async Task<IActionResult> Index()
        {
            var projections = await _repository.GetProjections();
            return View(projections);
        }

		// GET: Projection/Register
		public IActionResult Register()
        {
            return View();
        }

		//POST: Projection/Create
		[HttpPost, ActionName("Register")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegisterPost(Projection projection)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(projection);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New projection registered";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Projection registration failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(projection);
        }

		// GET: projection/Edit/1
		public async Task<IActionResult> Edit(int id)
        {
            var projection = await _repository.GetProjection(id);

            if (projection == null)
            {
                return NotFound();
            }

            return View(projection);
        }

		// POST: projection/Edit/1
		[HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var projectionToUpdate = await _context.Projections.FirstOrDefaultAsync(a => a.EPSGCode == id);

            if (await TryUpdateModelAsync(
				projectionToUpdate,
                "",
                a => a.Name, 
                a => a.Description, 
                a => a.MaxBoundX,
				a => a.MaxBoundY,
				a => a.MinBoundX,
				a => a.MinBoundY,
				a => a.DefaultRenderedDecimalPlaces,
				a => a.Proj4Definition))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Projection definition edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Projection definition edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(projectionToUpdate);
        }

		// GET: projection/Delete/1
		public async Task<IActionResult> Delete(int id)
        {
            var projection = await _repository.GetProjection(id);

            if (projection == null)
            {
                return NotFound();
            }

            return View(projection);
        }

		// POST: projection/Delete/1
		[HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var projectionToDelete = await _context.Projections.FirstOrDefaultAsync(a => a.EPSGCode == id);
           
                try
                {
                    _context.Projections.Remove(projectionToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = "Projection definition deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Projection delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
           
            return View(projectionToDelete);
        }
    }
}
