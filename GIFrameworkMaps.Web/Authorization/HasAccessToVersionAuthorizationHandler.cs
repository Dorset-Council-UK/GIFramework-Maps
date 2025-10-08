using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Authorization
{
	public class HasAccessToVersionAuthorizationHandler(ICommonRepository repository) : AuthorizationHandler<HasAccessToVersionRequirement, Data.Models.Version>
    {
        private readonly ICommonRepository _repository = repository;

		protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            HasAccessToVersionRequirement requirement,
            Data.Models.Version resource)
        {

            if(!resource.RequireLogin)
            {
                context.Succeed(requirement);
            }
            else
            {
                if (context.User.Identity.IsAuthenticated)
                {
                    var claimsIdentity = (ClaimsIdentity)context.User.Identity;
                    var claim = claimsIdentity.FindFirst(ClaimTypes.NameIdentifier);
                    var userId = claim.Value;
					var emailClaim = claimsIdentity.FindFirst(ClaimTypes.Email);
					var email = emailClaim?.Value ?? string.Empty;
					var canAccess = _repository.CanUserAccessVersion(userId, email, resource.Id).Result;
					if (canAccess)
                    {
                        context.Succeed(requirement);
                    }
                }
            }
            return Task.CompletedTask;
        }
    }
}
