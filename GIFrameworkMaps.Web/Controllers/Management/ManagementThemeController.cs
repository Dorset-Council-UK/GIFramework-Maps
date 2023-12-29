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
    public class ManagementThemeController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementThemeController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementThemeController(
            ILogger<ManagementThemeController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: Theme
        public async Task<IActionResult> Index()
        {
            var themes = await _repository.GetThemes();
            return View(themes);
        }

        // GET: Theme/Create
        public IActionResult Create()
        {
            return View();
        }

        //POST: Theme/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(Theme theme)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    theme.PrimaryColour = theme.PrimaryColour.Replace("#", "");
                    _context.Add(theme);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New theme created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Theme creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(theme);
        }

        // GET: Theme/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var theme = await _repository.GetTheme(id);
            theme.PrimaryColour = $"#{theme.PrimaryColour}";

            if (theme == null)
            {
                return NotFound();
            }

            return View(theme);
        }

        // POST: Theme/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id)
        {
            var themeToUpdate = await _context.Theme.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                themeToUpdate,
                "",
                a => a.Name, 
                a=> a.Description, 
                a => a.PrimaryColour, 
                a => a.LogoURL, 
                a => a.CustomFaviconURL))
            {

                try
                {
                    themeToUpdate.PrimaryColour = themeToUpdate.PrimaryColour.Replace("#", "");
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Theme edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Theme edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(themeToUpdate);
        }

        // GET: Theme/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var theme = await _repository.GetTheme(id);

            if (theme == null)
            {
                return NotFound();
            }

            return View(theme);
        }

        // POST: Theme/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var themeToDelete = await _context.Theme.FirstOrDefaultAsync(a => a.Id == id);

                try
                {
                    _context.Theme.Remove(themeToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = "Theme deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Theme delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            return View(themeToDelete);
        }

    }
}
