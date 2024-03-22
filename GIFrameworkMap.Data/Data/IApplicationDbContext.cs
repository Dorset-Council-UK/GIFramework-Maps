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
        DbSet<Attribution> Attribution { get; set; }
        DbSet<Basemap> Basemap { get; set; }
        DbSet<Bookmark> Bookmarks { get; set; }
        DbSet<Bound> Bound { get; set; }
        DbSet<Category> Category { get; set; }
        DbSet<CategoryLayer> CategoryLayer { get; set; }
        DbSet<DatabaseSearchDefinition> DatabaseSearchDefinitions { get; set; }
        DbSet<DatabaseSearchResult> DatabaseSearchResults { get; set; }
        DbSet<Layer> Layer { get; set; }
        DbSet<LayerSource> LayerSource { get; set; }
        DbSet<LayerSourceOption> LayerSourceOption { get; set; }
        DbSet<LayerSourceType> LayerSourceType { get; set; }
        DbSet<LocalSearchDefinition> LocalSearchDefinitions { get; set; }
        DbSet<PrintConfiguration> PrintConfigurations { get; set; }
		DbSet<Projection> Projections { get; set; }
        DbSet<ProxyAllowedHost> ProxyAllowedHosts { get; set; }
        DbSet<SearchDefinition> SearchDefinitions { get; set; }
        DbSet<ShortLink> ShortLink { get; set; }
        DbSet<Theme> Theme { get; set; }
        DbSet<TourDetails> TourDetails { get; set; }
        DbSet<TourStep> TourStep { get; set; }
        DbSet<Version> Versions { get; set; }
		DbSet<VersionContact> VersionContact { get; set; }
		DbSet<VersionLayer> VersionLayer { get; set; }
		DbSet<VersionPrintConfiguration> VersionPrintConfiguration { get; set; }
        DbSet<VersionSearchDefinition> VersionSearchDefinition { get; set; }
        DbSet<VersionUser> VersionUser { get; set; }
        DbSet<WebLayerServiceDefinition> WebLayerServiceDefinitions { get; set; }
        DbSet<WelcomeMessage> WelcomeMessages { get; set; }
    }
}
