﻿using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Tour;
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

        // GET: TourStep
        public async Task<IActionResult> Index()
        {
            var steps = await _repository.GetSteps();
            return View(steps);
        }

        // GET: TourStep/Create
        public IActionResult Create()
        {
            return View();
        }

        //POST: TourStep/Create
        [HttpPost, ActionName("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePost(TourStep step)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    _context.Add(step);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
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
            var stepToUpdate = await _context.TourStep.FirstOrDefaultAsync(a => a.Id == id);

            if (await TryUpdateModelAsync(
                stepToUpdate,
                "",
                a => a.Title, 
                a => a.Content, 
                a => a.AttachToSelector,
                a => a.AttachToPosition,
                a => a.StepNumber,
                a => a.TourDetailsId))
            {

                try
                {
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
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
            var stepToDelete = await _context.TourStep.FirstOrDefaultAsync(a => a.Id == id);

                try
                {
                    _context.TourStep.Remove(stepToDelete);
                    await _context.SaveChangesAsync();
                    return RedirectToAction(nameof(Index));
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
