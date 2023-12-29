using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementUserController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementUserController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementUserController(
            ILogger<ManagementUserController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }
        public async Task<IActionResult> Index()
        {
            var users = await _repository.GetUsers();

            if (users != null)
            {
                //fetch roles and version permissions
                return View(users);
            }

            return NotFound();
            
        }

        public async Task<IActionResult> Edit(string id)
        {
            var user = await _repository.GetUser(id);
    
            if(user != null)
            {
                //fetch roles and version permissions
                var editModel = new UserEditModel() { User = user };
                RebuildViewModel(ref editModel, user);
                return View(editModel);
            }   
            return NotFound();
        }

        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(string id,
                        int[] selectedRoles,
                        int[] selectedVersions)
        {
            var userToUpdate = await _repository.GetUser(id);
            try
            {
                UpdateUserRoles(selectedRoles, userToUpdate);
                UpdateUserVersions(selectedVersions, userToUpdate);
                await _context.SaveChangesAsync();
                TempData["Message"] = $"User {userToUpdate.DisplayName} edited";
                TempData["MessageType"] = "success";
                return RedirectToAction(nameof(Index));
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "User update failed");
                ModelState.AddModelError("", "Unable to save changes. " +
                    "Try again, and if the problem persists, " +
                    "contact your system administrator.");
            }
            var editModel = new UserEditModel() { 
                SelectedRoles = selectedRoles.ToList(), 
                SelectedVersions = selectedVersions.ToList(), 
                User = userToUpdate
            };
            RebuildViewModel(ref editModel, userToUpdate);
            return View(editModel);
        }

        private void UpdateUserRoles(int[] selectedRoles, Microsoft.Graph.Beta.Models.User userToUpdate)
        {
            var existingRoles = _context.ApplicationUserRoles.Where(u => u.UserId == userToUpdate.Id).ToList();
            if (selectedRoles == null)
            {
                _context.Remove(existingRoles);
                return;
            }

            var selectedRolesHS = new HashSet<int>(selectedRoles);
            var existingRolesHS = new HashSet<int>();
            if (existingRoles != null)
            {
                existingRolesHS = new HashSet<int>(existingRoles.Select(r => r.ApplicationRoleId));
            }

            foreach (var role in _context.ApplicationRoles)
            {
                if (selectedRolesHS.Contains(role.Id))
                {
                    if (!existingRolesHS.Contains(role.Id))
                    {
                        ApplicationUserRole roleToAdd = new() { ApplicationRoleId = role.Id, UserId = userToUpdate.Id };
                        _context.Add(roleToAdd);
                    }
                }
                else
                {

                    if (existingRolesHS.Contains(role.Id))
                    {
                        ApplicationUserRole roleToRemove = existingRoles.FirstOrDefault(i => i.ApplicationRoleId == role.Id);
                        _context.Remove(roleToRemove);
                    }
                }
            }
        }

        private void UpdateUserVersions(int[] selectedVersions, Microsoft.Graph.Beta.Models.User userToUpdate)
        {
            var existingVersions = _context.VersionUser.Where(u => u.UserId == userToUpdate.Id).ToList();
            if (selectedVersions == null)
            {
                _context.Remove(existingVersions);
                return;
            }

            var selectedVersionsHS = new HashSet<int>(selectedVersions);
            var existingVersionsHS = new HashSet<int>();
            if (existingVersions != null)
            {
                existingVersionsHS = new HashSet<int>(existingVersions.Select(r => r.VersionId));
            }

            foreach (var version in _context.Versions.Where(v => v.RequireLogin == true))
            {
                if (selectedVersionsHS.Contains(version.Id))
                {
                    if (!existingVersionsHS.Contains(version.Id))
                    {
                        VersionUser versionToAdd = new() { VersionId = version.Id, UserId = userToUpdate.Id };
                        _context.Add(versionToAdd);
                    }
                }
                else
                {

                    if (existingVersionsHS.Contains(version.Id))
                    {
                        VersionUser versionToRemove = existingVersions.FirstOrDefault(i => i.VersionId == version.Id);
                        _context.Remove(versionToRemove);
                    }
                }
            }
        }

        private void RebuildViewModel(ref Data.Models.ViewModels.Management.UserEditModel model, Microsoft.Graph.Beta.Models.User user)
        {
            var versions = _context.Versions.Where(v => v.RequireLogin == true).OrderBy(v => v.Name).ToList();
            var roles = _context.ApplicationRoles.OrderBy(r => r.RoleName).ToList();

            model.AvailableVersions = versions;
            model.AvailableRoles = roles;

            model.SelectedVersions = _context.VersionUser.Where(vu => vu.UserId == user.Id).Select(vu => vu.VersionId).ToList();
            model.SelectedRoles = _context.ApplicationUserRoles.Where(aur => aur.UserId == user.Id).Select(aur => aur.ApplicationRoleId).ToList();
        }
    }
}
