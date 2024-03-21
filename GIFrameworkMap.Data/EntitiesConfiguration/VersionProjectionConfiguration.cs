using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionProjectionConfiguration : IEntityTypeConfiguration<VersionProjection>
	{
		public void Configure(EntityTypeBuilder<VersionProjection> builder)
		{
			builder
				.HasKey(o => new { o.ProjectionId, o.VersionId });
		}
	}
}
