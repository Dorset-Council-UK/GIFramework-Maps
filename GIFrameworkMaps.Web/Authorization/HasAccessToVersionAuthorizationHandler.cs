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
                if (context.User.IsAuthenticated)
                {
					var userId = context.User.UserId;
					var email = context.User.Email;
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
