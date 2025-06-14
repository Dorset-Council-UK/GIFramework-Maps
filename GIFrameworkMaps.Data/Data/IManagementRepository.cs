﻿using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Search;
using GIFrameworkMaps.Data.Models.Tour;
using GIFrameworkMaps.Data.ViewModels.Management;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
	public interface IManagementRepository
    {
        bool PurgeCache();
        Task<Attribution?> GetAttribution(int id);
        Task<List<Attribution>> GetAttributions();
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
		Task<List<LayerDisclaimer>> GetLayerDisclaimers();
		Task<LayerDisclaimer?> GetLayerDisclaimer(int id);
		Task<LayerDisclaimerViewModel?> GetLayerDisclaimerViewModel(int id);
		Task<List<Category>> GetLayerCategories();
        Task<Category?> GetLayerCategory(int id);
        Task<List<CategoryLayer>> GetLayerCategoriesLayerAppearsIn(int layerId);
        Task<List<TourStep>> GetSteps();
        Task<SearchDefinition?> GetSearchDefinition(int id);
        Task<List<SearchDefinition>> GetSearchDefinitions();
        Task<APISearchDefinition?> GetAPISearchDefinition(int id);
        Task<List<APISearchDefinition>> GetAPISearchDefinitions();
        Task<DatabaseSearchDefinition?> GetDatabaseSearchDefinition(int id);
        Task<List<DatabaseSearchDefinition>> GetDatabaseSearchDefinitions();
        Task<LocalSearchDefinition?> GetLocalSearchDefinition(int id);
        Task<List<LocalSearchDefinition>> GetLocalSearchDefinitions();
        Task<List<Microsoft.Graph.Beta.Models.User>> GetUsers();
        Task<Microsoft.Graph.Beta.Models.User?> GetUser(string id);
		Task<Projection?> GetProjection(int id);
		Task<List<Projection>> GetProjections();
		Task<AnalyticsViewModel> GetAnalyticsModel();
		Task<List<Basemap>> GetBasemaps();
		Task<Basemap?> GetBasemap(int id);
		Task<IList<Version>> GetVersionsLayerCategoriesAppearIn(IList<int> CategoryIds);
	}
}
