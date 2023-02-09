using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.EntityFrameworkCore;

namespace GIFrameworkMaps.Data
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public virtual DbSet<Models.Version> Versions { get; set; }
        public DbSet<Models.VersionUser> VersionUser { get; set; }
        public DbSet<Models.VersionSearchDefinition> VersionSearchDefinition { get; set; }
        public DbSet<Models.Search.SearchDefinition> SearchDefinitions { get; set; }
        public DbSet<Models.Search.APISearchDefinition> APISearchDefinitions { get; set; }
        public DbSet<Models.Search.DatabaseSearchDefinition> DatabaseSearchDefinitions { get; set; }
        public DbSet<Models.Search.LocalSearchDefinition> LocalSearchDefinitions { get; set; }
        public DbSet<Models.Search.DatabaseSearchResult> DatabaseSearchResults { get; set; }
        public DbSet<Models.VersionPrintConfiguration> VersionPrintConfiguration { get; set; }
        public DbSet<Models.Print.PrintConfiguration> PrintConfigurations { get; set; }
        public DbSet<Models.WelcomeMessage> WelcomeMessages { get; set; }
        public DbSet<Models.Tour.TourDetails> TourDetails { get; set; }
        public DbSet<Models.Layer> Layer { get; set; }
        public DbSet<Models.Basemap> Basemap { get; set; }
        public DbSet<Models.Authorization.ApplicationRole> ApplicationRoles { get; set; }
        public DbSet<Models.Authorization.ApplicationUserRole> ApplicationUserRoles { get; set; }
        public DbSet<Models.WebLayerServiceDefinition> WebLayerServiceDefinitions { get; set; }
        public DbSet<Models.ProxyAllowedHost> ProxyAllowedHosts{get;set;}
        public DbSet<Models.Attribution> Attribution { get; set; }
        public DbSet<Models.Theme> Theme { get; set; }
        public DbSet<Models.Bound> Bound { get; set; }
        public DbSet<Models.LayerSource> LayerSource { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema("giframeworkmaps");
            modelBuilder.Entity<VersionUser>().HasKey(v => new { v.UserId, v.VersionId });
            modelBuilder.Entity<VersionBasemap>().HasKey(v => new { v.BasemapId, v.VersionId });
            modelBuilder.Entity<VersionCategory>().HasKey(v => new { v.CategoryId, v.VersionId });
            modelBuilder.Entity<CategoryLayer>().HasKey(c => new { c.CategoryId, c.LayerId });
            modelBuilder.Entity<VersionSearchDefinition>().HasKey(v => new { v.SearchDefinitionId, v.VersionId });
            modelBuilder.Entity<VersionPrintConfiguration>().HasKey(v => new { v.PrintConfigurationId, v.VersionId });
            modelBuilder.Entity<ApplicationUserRole>().HasKey(u => new { u.UserId, u.ApplicationRoleId });
            modelBuilder.Entity<WelcomeMessage>().Property(w => w.Frequency).HasDefaultValue(-1);
            modelBuilder.Entity<WelcomeMessage>().Property(w => w.DismissOnButtonOnly).HasDefaultValue(false);
            modelBuilder.Entity<TourDetails>().Property(w => w.Frequency).HasDefaultValue(-1);
            modelBuilder.Entity<WebLayerServiceDefinition>().Property(w => w.Type).HasConversion<string>();
            modelBuilder.Entity<Layer>().Property(l => l.ProxyMetaRequests).HasDefaultValue(false);
            modelBuilder.Entity<Layer>().Property(l => l.ProxyMapRequests).HasDefaultValue(false);
            /*Exclude DB search results from EF Migrations - https://stackoverflow.com/a/65151839/863487 */
            modelBuilder.Entity<Models.Search.DatabaseSearchResult>().HasNoKey().ToTable(nameof(DatabaseSearchResults), t => t.ExcludeFromMigrations());
        }
    }
}
