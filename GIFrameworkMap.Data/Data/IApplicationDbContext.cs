using Microsoft.EntityFrameworkCore;

namespace GIFrameworkMaps.Data
{
    public interface IApplicationDbContext
    {
        DbSet<Models.Version> Versions { get; set; }
        DbSet<Models.VersionUser> VersionUser { get; set; }
        DbSet<Models.VersionSearchDefinition> VersionSearchDefinition { get; set; }
        DbSet<Models.Search.SearchDefinition> SearchDefinitions { get; set; }
        DbSet<Models.Search.APISearchDefinition> APISearchDefinitions { get; set; }
        DbSet<Models.Search.DatabaseSearchDefinition> DatabaseSearchDefinitions { get; set; }
        DbSet<Models.Search.LocalSearchDefinition> LocalSearchDefinitions { get; set; }
        DbSet<Models.Search.DatabaseSearchResult> DatabaseSearchResults { get; set; }
        DbSet<Models.VersionPrintConfiguration> VersionPrintConfiguration { get; set; }
        DbSet<Models.Print.PrintConfiguration> PrintConfigurations { get; set; }
        DbSet<Models.WelcomeMessage> WelcomeMessages { get; set; }
        DbSet<Models.Tour.TourDetails> TourDetails { get; set; }
        DbSet<Models.Layer> Layer { get; set; }
        DbSet<Models.Basemap> Basemap { get; set; }
        DbSet<Models.Authorization.ApplicationRole> ApplicationRoles { get; set; }
        DbSet<Models.Authorization.ApplicationUserRole> ApplicationUserRoles { get; set; }
        DbSet<Models.WebLayerServiceDefinition> WebLayerServiceDefinitions { get; set; }
        DbSet<Models.ProxyAllowedHost> ProxyAllowedHosts { get; set; }
        DbSet<Models.Attribution> Attribution { get; set; }
        DbSet<Models.Theme> Theme { get; set; }
        DbSet<Models.Bound> Bound { get; set; }
        DbSet<Models.Category> Category { get; set; }
        DbSet<Models.LayerSource> LayerSource { get; set; }
        DbSet<Models.LayerSourceType> LayerSourceType { get; set; }
    }
}
