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
        public DbSet<Attribution> Attributions { get; set; }
        public DbSet<Basemap> Basemaps { get; set; }
        public DbSet<Bookmark> Bookmarks { get; set; }
        public DbSet<Bound> Bounds { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<CategoryLayer> CategoryLayers { get; set; }
        public DbSet<DatabaseSearchDefinition> DatabaseSearchDefinitions { get; set; }
        public DbSet<DatabaseSearchResult> DatabaseSearchResults { get; set; }
        public DbSet<Layer> Layers { get; set; }
        public DbSet<LayerSource> LayerSources { get; set; }
        public DbSet<LayerSourceOption> LayerSourceOptions { get; set; }
        public DbSet<LayerSourceType> LayerSourceTypes { get; set; }
		public DbSet<LayerDisclaimer> LayerDisclaimers { get; set; }
        public DbSet<LocalSearchDefinition> LocalSearchDefinitions { get; set; }
        public DbSet<PrintConfiguration> PrintConfigurations { get; set; }
		public DbSet<Projection> Projections { get; set; }
        public DbSet<ProxyAllowedHost> ProxyAllowedHosts { get; set; }
        public DbSet<SearchDefinition> SearchDefinitions { get; set; }
        public DbSet<ShortLink> ShortLinks { get; set; }
        public DbSet<Theme> Themes { get; set; }
        public DbSet<TourDetail> TourDetails { get; set; }
        public DbSet<TourStep> TourSteps { get; set; }
		public virtual DbSet<Version> Versions { get; set; }
		public DbSet<VersionContact> VersionContacts { get; set; }
		public DbSet<VersionLayer> VersionLayers { get; set; }
        public DbSet<VersionPrintConfiguration> VersionPrintConfigurations { get; set; }
		public DbSet<VersionSearchDefinition> VersionSearchDefinitions { get; set; }
		public DbSet<VersionUser> VersionUsers { get; set; }
        public DbSet<WebLayerServiceDefinition> WebLayerServiceDefinitions { get; set; }
        public DbSet<WelcomeMessage> WelcomeMessages { get; set; }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema("giframeworkmaps");

			// DbSet configurations
			modelBuilder.ApplyConfiguration(new ApplicationUserRoleConfiguration());
			modelBuilder.ApplyConfiguration(new BasemapConfiguration());
			modelBuilder.ApplyConfiguration(new CategoryConfiguration());
			modelBuilder.ApplyConfiguration(new CategoryLayerConfiguration());
			modelBuilder.ApplyConfiguration(new DatabaseSearchResultConfiguration());
			modelBuilder.ApplyConfiguration(new LayerConfiguration());
			modelBuilder.ApplyConfiguration(new LayerSourceConfiguration());
			modelBuilder.ApplyConfiguration(new LayerDisclaimerConfiguration());
			modelBuilder.ApplyConfiguration(new ProjectionConfiguration());
			modelBuilder.ApplyConfiguration(new ShortLinkConfiguration());
			modelBuilder.ApplyConfiguration(new TourDetailConfiguration());
			modelBuilder.ApplyConfiguration(new VersionConfiguration());
			modelBuilder.ApplyConfiguration(new VersionContactConfiguration());
			modelBuilder.ApplyConfiguration(new VersionLayerConfiguration());
			modelBuilder.ApplyConfiguration(new VersionPrintConfigurationConfiguration());
			modelBuilder.ApplyConfiguration(new VersionSearchDefinitionConfiguration());
			modelBuilder.ApplyConfiguration(new VersionUserConfiguration());
			modelBuilder.ApplyConfiguration(new WebLayerServiceDefinitionConfiguration());
			modelBuilder.ApplyConfiguration(new WelcomeMessageConfiguration());

			// Additional configurations
			modelBuilder.ApplyConfiguration(new VersionAnalyticConfiguration());
			modelBuilder.ApplyConfiguration(new VersionBasemapConfiguration());
			modelBuilder.ApplyConfiguration(new VersionCategoryConfiguration());
			modelBuilder.ApplyConfiguration(new VersionProjectionConfiguration());
		}
    }
}
