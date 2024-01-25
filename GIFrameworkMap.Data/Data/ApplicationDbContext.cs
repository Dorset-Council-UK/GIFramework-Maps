using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.EntityFrameworkCore;

namespace GIFrameworkMaps.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options), IApplicationDbContext
    {
		public virtual DbSet<Version> Versions { get; set; }
        public DbSet<VersionLayer> VersionLayer { get; set; }
        public DbSet<VersionUser> VersionUser { get; set; }
        public DbSet<VersionContact> VersionContact { get; set; }
        public DbSet<VersionSearchDefinition> VersionSearchDefinition { get; set; }
        public DbSet<Models.Search.SearchDefinition> SearchDefinitions { get; set; }
        public DbSet<Models.Search.APISearchDefinition> APISearchDefinitions { get; set; }
        public DbSet<Models.Search.DatabaseSearchDefinition> DatabaseSearchDefinitions { get; set; }
        public DbSet<Models.Search.LocalSearchDefinition> LocalSearchDefinitions { get; set; }
        public DbSet<Models.Search.DatabaseSearchResult> DatabaseSearchResults { get; set; }
        public DbSet<VersionPrintConfiguration> VersionPrintConfiguration { get; set; }
        public DbSet<Models.Print.PrintConfiguration> PrintConfigurations { get; set; }
        public DbSet<WelcomeMessage> WelcomeMessages { get; set; }
        public DbSet<TourDetails> TourDetails { get; set; }
        public DbSet<TourStep> TourStep { get; set; }
        public DbSet<Layer> Layer { get; set; }
        public DbSet<Basemap> Basemap { get; set; }
        public DbSet<Category> Category { get; set; }
        public DbSet<CategoryLayer> CategoryLayer { get; set; }
        public DbSet<ApplicationRole> ApplicationRoles { get; set; }
        public DbSet<ApplicationUserRole> ApplicationUserRoles { get; set; }
        public DbSet<WebLayerServiceDefinition> WebLayerServiceDefinitions { get; set; }
        public DbSet<ProxyAllowedHost> ProxyAllowedHosts{get;set;}
        public DbSet<Attribution> Attribution { get; set; }
        public DbSet<Theme> Theme { get; set; }
        public DbSet<Bound> Bound { get; set; }
        public DbSet<LayerSource> LayerSource { get; set; }
        public DbSet<LayerSourceType> LayerSourceType { get; set; }
        public DbSet<LayerSourceOption> LayerSourceOption { get; set; }
        public DbSet<ShortLink> ShortLink { get; set; }
        public DbSet<AnalyticsDefinition> AnalyticsDefinitions { get; set; }
        public DbSet<Bookmark> Bookmarks { get; set; }
		public DbSet<Projection> Projections { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema("giframeworkmaps");
            modelBuilder.Entity<VersionUser>().HasKey(v => new { v.UserId, v.VersionId });
            modelBuilder.Entity<VersionLayer>().HasIndex(v => new { v.LayerId, v.VersionId }).IsUnique(true);
            modelBuilder.Entity<VersionBasemap>().HasKey(v => new { v.BasemapId, v.VersionId });
            modelBuilder.Entity<VersionCategory>().HasKey(v => new { v.CategoryId, v.VersionId });
            modelBuilder.Entity<VersionAnalytic>().HasKey(v => new { v.AnalyticsDefinitionId, v.VersionId });
            modelBuilder.Entity<VersionContact>().HasKey(v => new { v.VersionContactId, v.VersionId });
            modelBuilder.Entity<CategoryLayer>().HasKey(c => new { c.CategoryId, c.LayerId });
            modelBuilder.Entity<VersionSearchDefinition>().HasKey(v => new { v.SearchDefinitionId, v.VersionId });
            modelBuilder.Entity<VersionPrintConfiguration>().HasKey(v => new { v.PrintConfigurationId, v.VersionId });
            modelBuilder.Entity<ApplicationUserRole>().HasKey(u => new { u.UserId, u.ApplicationRoleId });
            modelBuilder.Entity<WelcomeMessage>().Property(w => w.Frequency).HasDefaultValue(-1);
            modelBuilder.Entity<WelcomeMessage>().Property(w => w.ModalSize).HasDefaultValue("modal-lg");
            modelBuilder.Entity<WelcomeMessage>().Property(w => w.DismissOnButtonOnly).HasDefaultValue(false);
            modelBuilder.Entity<TourDetails>().Property(w => w.Frequency).HasDefaultValue(-1);
            modelBuilder.Entity<WebLayerServiceDefinition>().Property(w => w.Type).HasConversion<string>();
            modelBuilder.Entity<Layer>().Property(l => l.ProxyMetaRequests).HasDefaultValue(false);
            modelBuilder.Entity<Layer>().Property(l => l.ProxyMapRequests).HasDefaultValue(false);
            modelBuilder.Entity<ShortLink>().HasKey(s => new { s.ShortId });
            modelBuilder.Entity<ShortLink>().Property(s => s.Created).HasDefaultValueSql("CURRENT_TIMESTAMP");
			modelBuilder.Entity<Projection>().HasKey(p => p.EPSGCode);
            /*Exclude DB search results from EF Migrations - https://stackoverflow.com/a/65151839/863487 */
            modelBuilder.Entity<Models.Search.DatabaseSearchResult>().HasNoKey().ToTable(nameof(DatabaseSearchResults), t => t.ExcludeFromMigrations());
        }
    }
}
