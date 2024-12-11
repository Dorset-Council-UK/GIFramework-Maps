using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.Models.Print;
using GIFrameworkMaps.Data.Models.Search;
using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.EntityFrameworkCore;

namespace GIFrameworkMaps.Data
{
    public interface IApplicationDbContext
    {
        DbSet<AnalyticsDefinition> AnalyticsDefinitions { get; set; }
        DbSet<APISearchDefinition> APISearchDefinitions { get; set; }
        DbSet<ApplicationRole> ApplicationRoles { get; set; }
        DbSet<ApplicationUserRole> ApplicationUserRoles { get; set; }
        DbSet<Attribution> Attributions { get; set; }
        DbSet<Basemap> Basemaps { get; set; }
        DbSet<Bookmark> Bookmarks { get; set; }
        DbSet<Bound> Bounds { get; set; }
        DbSet<Category> Categories { get; set; }
        DbSet<CategoryLayer> CategoryLayers { get; set; }
        DbSet<DatabaseSearchDefinition> DatabaseSearchDefinitions { get; set; }
        DbSet<DatabaseSearchResult> DatabaseSearchResults { get; set; }
        DbSet<Layer> Layers { get; set; }
        DbSet<LayerSource> LayerSources { get; set; }
		DbSet<LayerDisclaimer> LayerDisclaimers { get; set; }
        DbSet<LayerSourceOption> LayerSourceOptions { get; set; }
        DbSet<LayerSourceType> LayerSourceTypes { get; set; }
        DbSet<LocalSearchDefinition> LocalSearchDefinitions { get; set; }
        DbSet<PrintConfiguration> PrintConfigurations { get; set; }
		DbSet<Projection> Projections { get; set; }
        DbSet<ProxyAllowedHost> ProxyAllowedHosts { get; set; }
        DbSet<SearchDefinition> SearchDefinitions { get; set; }
        DbSet<ShortLink> ShortLinks { get; set; }
        DbSet<Theme> Themes { get; set; }
        DbSet<TourDetail> TourDetails { get; set; }
        DbSet<TourStep> TourSteps { get; set; }
        DbSet<Version> Versions { get; set; }
		DbSet<VersionContact> VersionContacts { get; set; }
		DbSet<VersionLayer> VersionLayers { get; set; }
		DbSet<VersionPrintConfiguration> VersionPrintConfigurations { get; set; }
        DbSet<VersionSearchDefinition> VersionSearchDefinitions { get; set; }
        DbSet<VersionUser> VersionUsers { get; set; }
        DbSet<WebLayerServiceDefinition> WebLayerServiceDefinitions { get; set; }
        DbSet<WelcomeMessage> WelcomeMessages { get; set; }
    }
}
