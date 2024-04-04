using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.ViewModels;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
	public interface ICommonRepository
    {
        Version? GetVersionBySlug(string slug1, string slug2, string slug3);
        bool CanUserAccessVersion(string userId, int id);
        Task<List<Version>> GetVersionsListForUser(string? userId);
        Version? GetVersion(int id);
        VersionViewModel GetVersionViewModel(Version version);
        List<Version> GetVersions();
        List<ApplicationUserRole> GetUserRoles(string userId);
        List<WebLayerServiceDefinition> GetWebLayerServiceDefinitions();
        List<ProxyAllowedHost> GetProxyAllowedHosts();
        Task<List<ProxyAllowedHost>> GetProxyAllowedHostsAsync();
        Task<List<Bookmark>> GetBookmarksForUserAsync(string userId);
        Task<string> GenerateShortId(string url);
        Task<string> GetFullUrlFromShortId(string shortId);
        bool IsURLCurrentApplication(string url);
    }
}
