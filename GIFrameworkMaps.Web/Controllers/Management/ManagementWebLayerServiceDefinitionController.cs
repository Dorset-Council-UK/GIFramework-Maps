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
    public class ManagementWebLayerServiceDefinitionController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementWebLayerServiceDefinitionController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementWebLayerServiceDefinitionController(
            ILogger<ManagementWebLayerServiceDefinitionController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: WebLayerServiceDefinition
        public async Task<IActionResult> Index()
        {
            var webLayerServiceDefinitions = await _repository.GetWebLayerServiceDefinitions();
            return View(webLayerServiceDefinitions);
        }

        // GET: WebLayerServiceDefinition/Create
        public IActionResult Create()
        {
            return View();
        }

        //POST: WebLayerServiceDefinition/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(WebLayerServiceDefinition webLayerServiceDefinition)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(webLayerServiceDefinition);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New web layer service definition created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Web layer service definition creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(webLayerServiceDefinition);
        }

        // GET: WebLayerServiceDefinition/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var webLayerServiceDefinition = await _repository.GetWebLayerServiceDefinition(id);

            if (webLayerServiceDefinition == null)
            {
                return NotFound();
            }

            return View(webLayerServiceDefinition);
        }

        // POST: WebLayerServiceDefinition/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var webLayerServiceDefinitionToUpdate = await _context.WebLayerServiceDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                webLayerServiceDefinitionToUpdate,
                "",
                a => a.Name, 
                a => a.Description, 
                a => a.Url, 
                a => a.Type, 
                a => a.Version, 
                a => a.Category, 
                a => a.SortOrder, 
                a => a.ProxyMapRequests, 
                a => a.ProxyMetaRequests,
                a => a.AdminOnly))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Web layer service definition edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Web layer service definition edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(webLayerServiceDefinitionToUpdate);
        }

        // GET: WebLayerServiceDefinition/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var webLayerServiceDefinition = await _repository.GetWebLayerServiceDefinition(id);

            if (webLayerServiceDefinition == null)
            {
                return NotFound();
            }

            return View(webLayerServiceDefinition);
        }

        // POST: WebLayerServiceDefinition/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var webLayerServiceDefinitionToDelete = await _context.WebLayerServiceDefinitions.FirstOrDefaultAsync(a => a.Id == id);
           
                try
                {
                    _context.WebLayerServiceDefinitions.Remove(webLayerServiceDefinitionToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = "Web layer service definition deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Web layer service definition delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
           
            return View(webLayerServiceDefinitionToDelete);
        }
    }
}
