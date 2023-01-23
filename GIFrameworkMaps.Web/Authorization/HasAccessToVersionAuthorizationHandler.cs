using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Authorization
{
    public class HasAccessToVersionAuthorizationHandler : AuthorizationHandler<HasAccessToVersionRequirement, Data.Models.Version>
    {
        private readonly ICommonRepository _repository;
        public HasAccessToVersionAuthorizationHandler(
            ICommonRepository repository)
        {
            _repository = repository;
        }
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
                    var claim = claimsIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
                    var userId = claim.Value;
                    
                    if (_repository.CanUserAccessVersion(userId, resource.Id))
                    {
                        context.Succeed(requirement);
                    }
                }
            }
            return Task.CompletedTask;
        }
    }
}
