using GIFrameworkMaps.Data.Models.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class DatabaseSearchResultConfiguration : IEntityTypeConfiguration<DatabaseSearchResult>
	{
		// Exclude DB search results from EF Migrations - https://stackoverflow.com/a/65151839/863487
		public void Configure(EntityTypeBuilder<DatabaseSearchResult> builder)
		{
			builder
				.HasNoKey()
				.ToTable(nameof(ApplicationDbContext.DatabaseSearchResults), t => t.ExcludeFromMigrations());
		}
	}
}
