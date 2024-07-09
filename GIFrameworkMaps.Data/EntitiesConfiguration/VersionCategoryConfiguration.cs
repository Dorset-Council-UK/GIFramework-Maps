using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionCategoryConfiguration : IEntityTypeConfiguration<VersionCategory>
	{
		public void Configure(EntityTypeBuilder<VersionCategory> builder)
		{
			builder
				.HasKey(o => new { o.CategoryId, o.VersionId });

			builder
				.Navigation(o => o.Category)
				.AutoInclude();
		}
	}
}
