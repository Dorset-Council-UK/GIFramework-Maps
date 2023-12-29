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
    public class ManagementBoundController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementBoundController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementBoundController(
            ILogger<ManagementBoundController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Bound
        public async Task<IActionResult> Index()
        {
            var bounds = await _repository.GetBounds();
            return View(bounds);
        }

        // GET: Bound/Create
        public IActionResult Create()
        {
            return View();
        }

        //POST: Bound/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(Bound bound)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(bound);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New bound created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Bound creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(bound);
        }

        // GET: Bound/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var bound = await _repository.GetBound(id);

            if (bound == null)
            {
                return NotFound();
            }

            return View(bound);
        }

        // POST: Bound/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var boundToUpdate = await _context.Bound.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                boundToUpdate,
                "",
                a => a.Name, a=> a.Description, a => a.BottomLeftX, a => a.BottomLeftY, a => a.TopRightX, a => a.TopRightY))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Bound edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Bound edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(boundToUpdate);
        }

        // GET: Bound/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var bound = await _repository.GetBound(id);

            if (bound == null)
            {
                return NotFound();
            }

            return View(bound);
        }

        // POST: Bound/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var boundToDelete = await _context.Bound.FirstOrDefaultAsync(a => a.Id == id);
            //var linkedLayers = await _context.LayerSource.Where(l => l.Bound.Id == id).ToListAsync();
            //if (linkedLayers.Count == 0)
            //{
                try
                {
                    _context.Bound.Remove(boundToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = "Bound deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Bound delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            //}
            //else
            //{
            //    ModelState.AddModelError("", "There are layers in use that use this bound, so you cannot delete it.");
            //}
            return View(boundToDelete);
        }

    }
}
