using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Search;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
    public interface IManagementRepository
    {
        bool PurgeCache();
        Task<Attribution> GetAttribution(int id);
        Task<List<Attribution>> GetAttributions();
        Task<Version> GetVersion(int id);
        Task<List<Version>> GetVersions();
        Task<Bound> GetBound(int id);
        Task<List<Bound>> GetBounds();
        Task<Theme> GetTheme(int id);
        Task<List<Theme>> GetThemes();
        Task<WelcomeMessage> GetWelcomeMessage(int id);
        Task<List<WelcomeMessage>> GetWelcomeMessages();
        Task<WebLayerServiceDefinition> GetWebLayerServiceDefinition(int id);
        Task<List<WebLayerServiceDefinition>> GetWebLayerServiceDefinitions();
        Task<SearchDefinition> GetSearchDefinition(int id);
        Task<List<SearchDefinition>> GetSearchDefinitions();
        Task<APISearchDefinition> GetAPISearchDefinition(int id);
        Task<List<APISearchDefinition>> GetAPISearchDefinitions();
        Task<DatabaseSearchDefinition> GetDatabaseSearchDefinition(int id);
        Task<List<DatabaseSearchDefinition>> GetDatabaseSearchDefinitions();
        Task<LocalSearchDefinition> GetLocalSearchDefinition(int id);
        Task<List<LocalSearchDefinition>> GetLocalSearchDefinitions();
    }
}
