using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionBasemapConfiguration : IEntityTypeConfiguration<VersionBasemap>
	{
		public void Configure(EntityTypeBuilder<VersionBasemap> builder)
		{
			builder
				.HasKey(o => new { o.BasemapId, o.VersionId });
		}
	}
}
