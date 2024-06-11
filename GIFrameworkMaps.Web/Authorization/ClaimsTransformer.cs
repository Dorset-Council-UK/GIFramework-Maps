using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Authorization
{
	public class ClaimsTransformer(ICommonRepository commonRepository) : IClaimsTransformation
    {
        private readonly ICommonRepository _commonRepository = commonRepository;

		public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
        {
            var claimsIdentity = (ClaimsIdentity)principal.Identity;
            var userIdClaim = claimsIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            var userId = userIdClaim.Value;

            //fetch roles from user roles table
            var roles = _commonRepository.GetUserRoles(userId);
            
            foreach(var role in roles)
            {
                Claim customRoleClaim = new(claimsIdentity.RoleClaimType, role.Role.RoleName);
                claimsIdentity.AddClaim(customRoleClaim);
            }
            //fetch roles from extension_roles claim
            //Removed as not currently needed, but may be added/changed in future
            //var extensionRolesClaim = claimsIdentity.FindFirst("extension_roles");
            //if (extensionRolesClaim != null)
            //{
            //    /*TODO - Check for null*/
            //    var extensionRolesStr = extensionRolesClaim.Value;
            //    string[] extensionRolesList = extensionRolesStr.Split(";");
            //    foreach(string extensionRole in extensionRolesList)
            //    {
            //        Claim customRoleClaim = new Claim(claimsIdentity.RoleClaimType, extensionRole);
            //        claimsIdentity.AddClaim(customRoleClaim);
            //    }
            //}

            return Task.FromResult(principal);
        }
    }
}
