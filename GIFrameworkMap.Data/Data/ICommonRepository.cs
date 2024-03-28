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

        Task<bool> CanUserAccessVersion(string userId, int id);
		bool CanUserAccessVersionOriginal(string userId, int id);

		Task<Version?> GetVersion(int id);
		[System.Obsolete("Remove this later after benchmarks are done")]
		Version? GetVersionOriginal(int id);

		VersionViewModel GetVersionViewModel(Version version);

        Task<List<Version>> GetVersions();
		[System.Obsolete("Remove this later after benchmarks are done")]
		List<Version> GetVersionsOriginal();

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
