using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionPrintConfigurationConfiguration : IEntityTypeConfiguration<VersionPrintConfiguration>
	{
		public void Configure(EntityTypeBuilder<VersionPrintConfiguration> builder)
		{
			builder
				.HasKey(o => new { o.PrintConfigurationId, o.VersionId });
		}
	}
}
