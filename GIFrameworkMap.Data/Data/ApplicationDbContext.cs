using GIFrameworkMaps.Data.EntitiesConfiguration;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.Models.Print;
using GIFrameworkMaps.Data.Models.Search;
using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.EntityFrameworkCore;

namespace GIFrameworkMaps.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options), IApplicationDbContext
    {
        public DbSet<AnalyticsDefinition> AnalyticsDefinitions { get; set; }
        public DbSet<APISearchDefinition> APISearchDefinitions { get; set; }
        public DbSet<ApplicationRole> ApplicationRoles { get; set; }
        public DbSet<ApplicationUserRole> ApplicationUserRoles { get; set; }
        public DbSet<Attribution> Attribution { get; set; }
        public DbSet<Basemap> Basemap { get; set; }
        public DbSet<Bookmark> Bookmarks { get; set; }
        public DbSet<Bound> Bound { get; set; }
        public DbSet<Category> Category { get; set; }
        public DbSet<CategoryLayer> CategoryLayer { get; set; }
        public DbSet<DatabaseSearchDefinition> DatabaseSearchDefinitions { get; set; }
        public DbSet<DatabaseSearchResult> DatabaseSearchResults { get; set; }
        public DbSet<Layer> Layer { get; set; }
        public DbSet<LayerSource> LayerSource { get; set; }
        public DbSet<LayerSourceOption> LayerSourceOption { get; set; }
        public DbSet<LayerSourceType> LayerSourceType { get; set; }
        public DbSet<LocalSearchDefinition> LocalSearchDefinitions { get; set; }
        public DbSet<PrintConfiguration> PrintConfigurations { get; set; }
		public DbSet<Projection> Projections { get; set; }
        public DbSet<ProxyAllowedHost> ProxyAllowedHosts{get;set;}
        public DbSet<SearchDefinition> SearchDefinitions { get; set; }
        public DbSet<ShortLink> ShortLink { get; set; }
        public DbSet<Theme> Theme { get; set; }
        public DbSet<TourDetails> TourDetails { get; set; }
        public DbSet<TourStep> TourStep { get; set; }
		public virtual DbSet<Version> Versions { get; set; }
		public DbSet<VersionContact> VersionContact { get; set; }
		public DbSet<VersionLayer> VersionLayer { get; set; }
        public DbSet<VersionPrintConfiguration> VersionPrintConfiguration { get; set; }
		public DbSet<VersionSearchDefinition> VersionSearchDefinition { get; set; }
		public DbSet<VersionUser> VersionUser { get; set; }
        public DbSet<WebLayerServiceDefinition> WebLayerServiceDefinitions { get; set; }
        public DbSet<WelcomeMessage> WelcomeMessages { get; set; }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema("giframeworkmaps");

			// AnalyticsDefinitions
			// APISearchDefinitions
			// ApplicationRoles
			modelBuilder.ApplyConfiguration(new ApplicationUserRoleConfiguration());
			// ApplicationUserRoles
			// Attribution
			// Basemap
			// Bookmarks
			// Bound
			// Category
			// CategoryLayer
			modelBuilder.ApplyConfiguration(new CategoryLayerConfiguration());
			// DatabaseSearchDefinitions
			// DatabaseSearchResults
			modelBuilder.ApplyConfiguration(new DatabaseSearchResultConfiguration());
			// Layer
			modelBuilder.ApplyConfiguration(new LayerConfiguration());
			// LayerSource
			// LayerSourceOption
			// LayerSourceType
			// LocalSearchDefinitions
			// PrintConfigurations
			// Projections
			modelBuilder.ApplyConfiguration(new ProjectionConfiguration());
			// ProxyAllowedHosts
			// SearchDefinitions
			// ShortLink
			modelBuilder.ApplyConfiguration(new ShortLinkConfiguration());
			// Theme
			// TourDetails
			modelBuilder.ApplyConfiguration(new TourDetailsConfiguration());
			// TourStep
			// Versions
			// VersionAnalytic ?? no DbSet and not in interface
			modelBuilder.ApplyConfiguration(new VersionAnalyticConfiguration());
			// VersionBasemap ?? no DbSet and not in interface
			modelBuilder.ApplyConfiguration(new VersionBasemapConfiguration());
			// VersionContact
			modelBuilder.ApplyConfiguration(new VersionContactConfiguration());
			// VersionCategory ?? no DbSet and not in interface
			modelBuilder.ApplyConfiguration(new VersionCategoryConfiguration());
			// VersionLayer
			modelBuilder.ApplyConfiguration(new VersionLayerConfiguration());
			// VersionPrintConfiguration
			modelBuilder.ApplyConfiguration(new VersionPrintConfigurationConfiguration());
			// VersionProjection ?? no DbSet and not in interface
			modelBuilder.ApplyConfiguration(new VersionProjectionConfiguration());
			// VersionSearchDefinition
			modelBuilder.ApplyConfiguration(new VersionSearchDefinitionConfiguration());
			// VersionUser
			modelBuilder.ApplyConfiguration(new VersionUserConfiguration());
			// WebLayerServiceDefinitions
			modelBuilder.ApplyConfiguration(new WebLayerServiceDefinitionConfiguration());
			// WelcomeMessages
			modelBuilder.ApplyConfiguration(new WelcomeMessageConfiguration());
        }
    }
}
