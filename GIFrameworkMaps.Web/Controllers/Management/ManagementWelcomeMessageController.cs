using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NodaTime;
using System;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
	[Authorize(Roles = "GIFWAdmin")]
    public class ManagementWelcomeMessageController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementWelcomeMessageController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementWelcomeMessageController(
            ILogger<ManagementWelcomeMessageController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        // GET: WelcomeMessage
        public async Task<IActionResult> Index()
        {
            var welcomeMessages = await _repository.GetWelcomeMessages();
            return View(welcomeMessages);
        }

        // GET: WelcomeMessage/Create
        public IActionResult Create()
        {
            Instant now = SystemClock.Instance.GetCurrentInstant();
            DateTimeZone tz = DateTimeZoneProviders.Tzdb.GetSystemDefault();
            ZonedDateTime zdt = now.InZone(tz);
            //default the update date to now
            var model = new WelcomeMessage() { UpdateDate = zdt.LocalDateTime };
            return View(model);
        }

        //POST: WelcomeMessage/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(WelcomeMessage welcomeMessage, DateTime UpdateDate)
        {
            welcomeMessage.UpdateDate = LocalDateTime.FromDateTime(UpdateDate);
            ModelState.Clear();
            TryValidateModel(welcomeMessage);
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(welcomeMessage);
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "New welcome message created";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Welcome message creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(welcomeMessage);
        }

        // GET: WelcomeMessage/Edit/1
        public async Task<IActionResult> Edit(int id)
        {
            var welcomeMessage = await _repository.GetWelcomeMessage(id);

            if (welcomeMessage == null)
            {
                return NotFound();
            }

            return View(welcomeMessage);
        }

        // POST: WelcomeMessage/Edit/1
        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(int id, DateTime UpdateDate)
        {
            var welcomeMessageToUpdate = await _context.WelcomeMessages.FirstOrDefaultAsync(a => a.Id == id);
            welcomeMessageToUpdate.UpdateDate = LocalDateTime.FromDateTime(UpdateDate);
            ModelState.Clear();
            TryValidateModel(welcomeMessageToUpdate);
            if (ModelState.IsValid)

                if (await TryUpdateModelAsync(
                welcomeMessageToUpdate,
                "",
                a => a.Name, 
                a => a.Title, 
                a => a.Content, 
                a => a.Frequency, 
                a => a.ModalSize,
                a => a.DismissOnButtonOnly, 
                a => a.DismissText))
            {
                LocalDateTime formattedUpdateDateTime = LocalDateTime.FromDateTime(UpdateDate);
                try
                {
                    await _context.SaveChangesAsync();
                    TempData["Message"] = "Welcome message edited";
                    TempData["MessageType"] = "success";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex )
                {
                    _logger.LogError(ex, "Welcome message edit failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            return View(welcomeMessageToUpdate);
        }

        // GET: WelcomeMessage/Delete/1
        public async Task<IActionResult> Delete(int id)
        {
            var welcomeMessage = await _repository.GetWelcomeMessage(id);

            if (welcomeMessage == null)
            {
                return NotFound();
            }

            return View(welcomeMessage);
        }

        // POST: WelcomeMessage/Delete/1
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirm(int id)
        {
            var welcomeMessageToDelete = await _context.WelcomeMessages.FirstOrDefaultAsync(a => a.Id == id);

                try
                {
                    _context.WelcomeMessages.Remove(welcomeMessageToDelete);
                    await _context.SaveChangesAsync();
                TempData["Message"] = "Welcome message deleted";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Welcome message delete failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }

            return View(welcomeMessageToDelete);
        }
    }
}
