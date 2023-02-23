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

        // GET: SearchDefinition/Create
        public IActionResult Create()
        {
            return View();
        }

        //POST: SearchDefinition/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(SearchDefinition searchDefinition)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(searchDefinition);
                    await _context.SaveChangesAsync();
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
            var searchDefinition = await _repository.GetSearchDefinition(id);

            if (searchDefinition == null)
            {
                return NotFound();
            }

            return View(searchDefinition);
        }

        // POST: SearchDefinition/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var searchDefinitionToUpdate = await _context.SearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

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
                a => a.SupressGeom))
                //a => a.Discriminator,
                //a => a.URLTemplate,
                //a => a.XFieldPath,
                //a => a.YFieldPath,
                //a => a.TitleFieldPath,
                //a => a.GeomFieldPath,
                //a => a.TableName,
                //a => a.XField,
                //a => a.YField,
                //a => a.GeomField,
                //a => a.WhereClause,
                //a => a.OrderbyClause,
                //a => a.MBRXMaxPath,
                //a => a.MBRXMinPath,
                //a => a.MBRYMaxPath,
                //a => a.MBRYMinPath,
                //a => a.LocalSearchName))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
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
