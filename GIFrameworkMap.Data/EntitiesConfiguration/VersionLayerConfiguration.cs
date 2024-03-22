using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionLayerConfiguration : IEntityTypeConfiguration<VersionLayer>
	{
		public void Configure(EntityTypeBuilder<VersionLayer> builder)
		{
			builder
				.HasIndex(o => new { o.LayerId, o.VersionId })
				.IsUnique(true);
		}
	}
}
