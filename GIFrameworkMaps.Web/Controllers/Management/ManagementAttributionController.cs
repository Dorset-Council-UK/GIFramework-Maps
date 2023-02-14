using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementAttributionController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementAttributionController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementAttributionController(
            ILogger<ManagementAttributionController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Attribution
        public async Task<IActionResult> Index()
        {
            var attributions = await _repository.GetAttributions();
            return View(attributions);
        }

        // GET: Attribution/Create
        public IActionResult Create()
        {
            return View();
        }

        //POST: Attribution/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(Attribution attribution)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(attribution);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Attribution creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(attribution);
        }

        // GET: Attribution/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var attribution = await _repository.GetAttribution(id);

            if (attribution == null)
            {
                return NotFound();
            }

            return View(attribution);
        }

        // POST: Attribution/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var attributionToUpdate = await _context.Attribution.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                attributionToUpdate,
                "",
                a => a.Name, a=> a.AttributionHTML))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Attribution edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(attributionToUpdate);
        }

        // GET: Attribution/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var attribution = await _repository.GetAttribution(id);

            if (attribution == null)
            {
                return NotFound();
            }

            return View(attribution);
        }

        // POST: Attribution/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var attributionToDelete = await _context.Attribution.FirstOrDefaultAsync(a => a.Id == id);
            var linkedLayers = await _context.LayerSource.Where(l => l.Attribution.Id == id).ToListAsync();
            if (linkedLayers.Count == 0)
            {
                try
                {
                    _context.Attribution.Remove(attributionToDelete);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Attribution delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            else
            {
                ModelState.AddModelError("", "There are layers in use that use this attribution, so you cannot delete it.");
            }
            return View(attributionToDelete);
        }


    }
}
