using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionAnalyticConfiguration : IEntityTypeConfiguration<VersionAnalytic>
	{
		public void Configure(EntityTypeBuilder<VersionAnalytic> builder)
		{
			builder
				.HasKey(o => new { o.AnalyticsDefinitionId, o.VersionId });
		}
	}
}
