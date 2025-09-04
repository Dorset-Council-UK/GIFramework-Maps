using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.ViewModels;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
	public interface ICommonRepository
    {
        Task<Version?> GetVersionBySlug(string slug1, string slug2, string slug3);
        Task<bool> CanUserAccessVersion(string userId, int id);
        Task<List<Version>> GetVersionsListForUser(string? userId);
        Task<Version?> GetVersion(int id);
		Task<VersionViewModel> GetVersionViewModel(Version version);
        Task<List<Version>> GetVersions();
		List<ApplicationUserRole> GetUserRoles(string userId);
        List<WebLayerServiceDefinition> GetWebLayerServiceDefinitions();
        List<ProxyAllowedHost> GetProxyAllowedHosts();
        Task<List<ProxyAllowedHost>> GetProxyAllowedHostsAsync();
        Task<List<Bookmark>> GetBookmarksForUserAsync(string userId);
        Task<string> GenerateShortId(string url);
        Task<string> GetFullUrlFromShortId(string shortId);
		Task<List<URLAuthorizationRule>> GetURLAuthorizationRules();
		bool IsURLCurrentApplication(string url);
		Task<string?> GetInfoTemplateByLayerId(int layerId);
		Task<string?> GetInfoListTitleTemplateByLayerId(int layerId);
		Task<string?> GetLayerSourceDescriptionById(int layerId);
	}
}
