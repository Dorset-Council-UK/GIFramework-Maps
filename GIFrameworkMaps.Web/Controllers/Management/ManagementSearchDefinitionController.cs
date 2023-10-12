using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Search;
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
    public class ManagementSearchDefinitionController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementSearchDefinitionController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementSearchDefinitionController(
            ILogger<ManagementSearchDefinitionController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: SearchDefinition
        public async Task<IActionResult> Index()
        {
            var searchDefinitions = await _repository.GetSearchDefinitions();
            return View(searchDefinitions);
        }

        // GET: APISearchDefinition/Create
        public IActionResult CreateAPISearchDefinition()
        {
            return View();
        }

        // GET: DatabaseSearchDefinition/Create
        public IActionResult CreateDatabaseSearchDefinition()
        {
            return View();
        }

        // GET: LocalSearchDefinition/Create
        public IActionResult CreateLocalSearchDefinition()
        {
            return View();
        }

        //POST: APISearchDefinition/Create
        [HttpPost, ActionName("CreateAPISearchDefinition")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateAPISearchDefinitionPost(APISearchDefinition searchDefinition)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(searchDefinition);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"New search definition created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Search definition creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(searchDefinition);
        }

        //POST: DatabaseSearchDefinition/Create
        [HttpPost, ActionName("CreateDatabaseSearchDefinition")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateDatabaseSearchDefinitionPost(DatabaseSearchDefinition searchDefinition)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(searchDefinition);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"New search definition created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Search definition creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(searchDefinition);
        }

        //POST: LocalSearchDefinition/Create
        [HttpPost, ActionName("CreateLocalSearchDefinition")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateLocalSearchDefinitionPost(LocalSearchDefinition searchDefinition)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(searchDefinition);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"New search definition created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Search definition creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(searchDefinition);
        }

        // GET: SearchDefinition/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var APISearchDefinition = await _repository.GetAPISearchDefinition(id);
            var databaseSearchDefinition = await _repository.GetDatabaseSearchDefinition(id);
            var localSearchDefinition = await _repository.GetLocalSearchDefinition(id);

            if (APISearchDefinition != null)
            {
                return RedirectToAction("EditAPISearchDefinition", new {id});
            }

            if (databaseSearchDefinition != null) 
            {
                return RedirectToAction("EditDatabaseSearchDefinition", new { id });
            }

            if (localSearchDefinition != null)
            {
                return RedirectToAction("EditLocalSearchDefinition", new { id });
            }

            return NotFound();
        }

        // GET: APISearchDefinition/Edit/1
        public async Task<IActionResult> EditAPISearchDefinition(int id)
        {
            var searchDefinition = await _repository.GetAPISearchDefinition(id);

            if (searchDefinition == null)
            {
                return NotFound();
            }

            return View(searchDefinition);
        }

        // GET: DatabaseSearchDefinition/Edit/1
        public async Task<IActionResult> EditDatabaseSearchDefinition(int id)
        {
            var searchDefinition = await _repository.GetDatabaseSearchDefinition(id);

            if (searchDefinition == null)
            {
                return NotFound();
            }

            return View(searchDefinition);
        }

        // GET: LocalSearchDefinition/Edit/1
        public async Task<IActionResult> EditLocalSearchDefinition(int id)
        {
            var searchDefinition = await _repository.GetLocalSearchDefinition(id);

            if (searchDefinition == null)
            {
                return NotFound();
            }

            return View(searchDefinition);
        }

        // POST: APISearchDefinition/Edit/1
        [HttpPost, ActionName("EditAPISearchDefinition")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditAPISearchDefinitionPost(int id)
        {
            var searchDefinitionToUpdate = await _context.APISearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                searchDefinitionToUpdate,
                "",
                a => a.Name,
                a => a.Title,
                a => a.AttributionHtml,
                a => a.MaxResults,
                a => a.ZoomLevel,
                a => a.EPSG,
                a => a.ValidationRegex,
                a => a.SupressGeom,
                a => a.URLTemplate,
                a => a.XFieldPath,
                a => a.YFieldPath,
                a => a.TitleFieldPath,
                a => a.GeomFieldPath,
                a => a.MBRXMaxPath,
                a => a.MBRXMinPath,
                a => a.MBRYMaxPath,
                a => a.MBRYMinPath))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"Search definition edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Serah definition edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(searchDefinitionToUpdate);
        }

        // POST: DatabaseSearchDefinition/Edit/1
        [HttpPost, ActionName("EditDatabaseSearchDefinition")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditDatabaseSearchDefinitionPost(int id)
        {
            var searchDefinitionToUpdate = await _context.DatabaseSearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                searchDefinitionToUpdate,
                "",
                a => a.Name,
                a => a.Title,
                a => a.AttributionHtml,
                a => a.MaxResults,
                a => a.ZoomLevel,
                a => a.EPSG,
                a => a.ValidationRegex,
                a => a.SupressGeom,
                a => a.TableName,
                a => a.XField,
                a => a.YField,
                a => a.GeomField,
                a => a.TitleField,
                a => a.WhereClause,
                a => a.OrderByClause))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"Search definition edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Serah definition edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(searchDefinitionToUpdate);
        }

        // POST: LocalSearchDefinition/Edit/1
        [HttpPost, ActionName("EditLocalSearchDefinition")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditLocalSearchDefinitionPost(int id)
        {
            var searchDefinitionToUpdate = await _context.LocalSearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                searchDefinitionToUpdate,
                "",
                a => a.Name,
                a => a.Title,
                a => a.AttributionHtml,
                a => a.MaxResults,
                a => a.ZoomLevel,
                a => a.EPSG,
                a => a.ValidationRegex,
                a => a.SupressGeom,
                a => a.LocalSearchName))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = $"Search definition edited definition edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Serah definition edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(searchDefinitionToUpdate);
        }


        // GET: SearchDefinition/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var searchDefinition = await _repository.GetSearchDefinition(id);

            if (searchDefinition == null)
            {
                return NotFound();
            }

            return View(searchDefinition);
        }

        // POST: SearchDefinition/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var searchDefinitionToDelete = await _context.SearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

                try
                {
                    _context.SearchDefinitions.Remove(searchDefinitionToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = $"Search definition deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Search definition delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }

            return View(searchDefinitionToDelete);
        }


    }
}
