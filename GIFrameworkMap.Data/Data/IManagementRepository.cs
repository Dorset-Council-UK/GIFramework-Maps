using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Tour;
using GIFrameworkMaps.Data.Models.Search;
using System.Collections.Generic;
using System.Threading.Tasks;
using GIFrameworkMaps.Data.Models.ViewModels.Management;

namespace GIFrameworkMaps.Data
{
    public interface IManagementRepository
    {
        bool PurgeCache();
        Task<Attribution?> GetAttribution(int id);
        Task<List<Attribution>> GetAttributions();
        Task<Version?> GetVersion(int id);
        Task<List<Version>> GetVersions();
        Task<Bound?> GetBound(int id);
        Task<List<Bound>> GetBounds();
        Task<Theme?> GetTheme(int id);
        Task<List<Theme>> GetThemes();
        Task<WelcomeMessage?> GetWelcomeMessage(int id);
        Task<List<WelcomeMessage>> GetWelcomeMessages();
        Task<WebLayerServiceDefinition?> GetWebLayerServiceDefinition(int id);
        Task<List<WebLayerServiceDefinition>> GetWebLayerServiceDefinitions();
        Task<Layer?> GetLayer(int id);
        Task<List<Layer>> GetLayers();
        Task<List<Layer>> GetLayersByLayerSource(int layerSourceId);
        Task<LayerSource?> GetLayerSource(int id);
        Task<List<LayerSource>> GetLayerSources();
        Task<LayerSourceOption?> GetLayerSourceOption(int id);
        Task<List<Category>> GetLayerCategories();
        Task<Category?> GetLayerCategory(int id);
        Task<List<CategoryLayer>> GetLayerCategoriesLayerAppearsIn(int layerId);
        Task<TourDetails?> GetTour(int id);
        Task<List<TourDetails>> GetTours();
        Task<TourStep?> GetStep(int id);
        Task<List<TourStep>> GetSteps();
        Task<SearchDefinition?> GetSearchDefinition(int id);
        Task<List<SearchDefinition>> GetSearchDefinitions();
        Task<APISearchDefinition?> GetAPISearchDefinition(int id);
        Task<List<APISearchDefinition>> GetAPISearchDefinitions();
        Task<DatabaseSearchDefinition?> GetDatabaseSearchDefinition(int id);
        Task<List<DatabaseSearchDefinition>> GetDatabaseSearchDefinitions();
        Task<LocalSearchDefinition?> GetLocalSearchDefinition(int id);
        Task<List<LocalSearchDefinition>> GetLocalSearchDefinitions();
        Task<Microsoft.Graph.Beta.Models.UserCollectionResponse?> GetUsers();
        Task<Microsoft.Graph.Beta.Models.User?> GetUser(string id);
        AnalyticsViewModel GetAnalyticsModel();
    }
}
