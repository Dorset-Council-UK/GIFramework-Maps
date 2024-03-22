using GIFrameworkMaps.Data.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
    public interface ICommonRepository
    {
        Models.Version? GetVersionBySlug(string slug1, string slug2, string slug3);
        bool CanUserAccessVersion(string userId, int id);
		Task<List<Models.Version>> GetVersionsListForUser(string? userId);
        Models.Version? GetVersion(int id);
        Models.ViewModels.VersionViewModel GetVersionViewModel(Version version);
        List<Models.Version> GetVersions();
        List<Models.Authorization.ApplicationUserRole> GetUserRoles(string userId);
        List<Models.WebLayerServiceDefinition> GetWebLayerServiceDefinitions();
        List<Models.ProxyAllowedHost> GetProxyAllowedHosts();
        Task<List<Models.ProxyAllowedHost>> GetProxyAllowedHostsAsync();
        Task<List<Models.Bookmark>> GetBookmarksForUserAsync(string userId);
        Task<string> GenerateShortId(string url);
        Task<string> GetFullUrlFromShortId(string shortId);
        bool IsURLCurrentApplication(string url);
    }
}
