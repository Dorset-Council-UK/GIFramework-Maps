using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.ViewModels.Management;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
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
        /* NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         **/
        private readonly ILogger<ManagementUserController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;

        public ManagementUserController(ILogger<ManagementUserController> logger, IManagementRepository repository, ApplicationDbContext context)
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var users = await _repository.GetUsers();

            if (users is not null)
            {
                //fetch roles and version permissions
                return View(users);
            }

            return NotFound();
            
        }

        public async Task<IActionResult> Edit(string id)
        {
            var user = await _repository.GetUser(id);
    
            if (user is null)
            {
				return NotFound();
            }

            //fetch roles and version permissions
            var editModel = new UserEditViewModel() { User = user };
            await RebuildViewModel(editModel, user);

            return View(editModel);
        }

        [HttpPost, ActionName("Edit")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditPost(string id, int[] selectedRoles, int[] selectedVersions)
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
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, contact your system administrator.");
            }

            var editModel = new UserEditViewModel()
			{ 
                SelectedRoles = selectedRoles.ToList(), 
                SelectedVersions = selectedVersions.ToList(), 
                User = userToUpdate
            };
            await RebuildViewModel(editModel, userToUpdate);

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
            var existingVersions = _context.VersionUsers.Where(u => u.UserId == userToUpdate.Id).ToList();
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

			// Get all version ids that require login
			var requireLoginVersionIds = _context.Versions
				.IgnoreAutoIncludes()
				.Where(v => v.RequireLogin == true)
				.Select(c => c.Id)
				.ToList();

			foreach (var versionId in requireLoginVersionIds)
            {
                if (selectedVersionsHS.Contains(versionId))
                {
                    if (!existingVersionsHS.Contains(versionId))
                    {
                        _context.Add(new VersionUser { VersionId = versionId, UserId = userToUpdate.Id });
                    }
                }
                else if (existingVersionsHS.Contains(versionId))
                {
                    VersionUser versionToRemove = existingVersions.FirstOrDefault(i => i.VersionId == versionId);
                    _context.Remove(versionToRemove);
                }
            }
        }

        private async Task RebuildViewModel(UserEditViewModel model, Microsoft.Graph.Beta.Models.User user)
        {
			// Select only the Id from the application user roles (dont get the data yet)
			var selectedApplicationRoleIds = _context.ApplicationUserRoles
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Where(o => o.UserId == user.Id)
				.Select(o => o.ApplicationRoleId);

			// Select only the Id from the version users (dont get the data yet)
			var selectedVersionUsersIds = _context.VersionUsers
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Where(o => o.UserId == user.Id)
				.Select(o => o.VersionId);

			// Select only the Id, Name, and Slug from the versions (dont get the data yet)
			var availableVersions = _context.Versions
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Where(o => o.RequireLogin == true)
				.Select(o => new { o.Id, o.Name, o.Slug })
				.OrderBy(o => o.Name);

			// Create a select list item for each available version. Meaning we dont need to do any database calls in the view
			// As this select list shows more data, combine the name and slug into the text
			model.AvailableVersions = await availableVersions
				.Select(o => new SelectListItem()
				{
					Text = model.CombineNameAndSlug(o.Name, o.Slug),
					Value = o.Id.ToString(),
					Selected = selectedApplicationRoleIds.Contains(o.Id)
				})
				.ToListAsync();

			// Create a select list item for each available role. Meaning we dont need to do any database calls in the view
			model.AvailableRoles = await _context.ApplicationRoles
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.OrderBy(o => o.RoleName)
				.Select(o => new SelectListItem()
				{
					Text = o.RoleName,
					Value = o.Id.ToString(),
					Selected = selectedApplicationRoleIds.Contains(o.Id)
				})
				.ToListAsync();

			model.SelectedVersions = await selectedVersionUsersIds.ToListAsync();
			model.SelectedRoles = await selectedApplicationRoleIds.ToListAsync();
		}
    }
}
