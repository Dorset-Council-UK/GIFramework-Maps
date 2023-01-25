using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data
{
    public interface ICommonRepository
    {
        Models.Version GetVersionBySlug(string slug1, string slug2, string slug3);
        bool CanUserAccessVersion(string userId, int id);
        Models.Version GetVersion(int id);
        Models.ViewModels.VersionViewModel GetVersionViewModel(int id);
        List<Models.Version> GetVersions();
        List<Models.Authorization.ApplicationUserRole> GetUserRoles(string userId);
        List<Models.WebLayerServiceDefinition> GetWebLayerServiceDefinitions();
        List<Models.ProxyAllowedHost> GetProxyAllowedHosts();
    }
}
