using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class LayerConfiguration : IEntityTypeConfiguration<Layer>
	{
		public void Configure(EntityTypeBuilder<Layer> builder)
		{
			builder
				.Property(o => o.ProxyMetaRequests)
				.HasDefaultValue(false);

			builder
				.Property(o => o.ProxyMapRequests)
				.HasDefaultValue(false);

			builder
				.Navigation(o => o.LayerSource)
				.AutoInclude();

			builder
				.Navigation(o => o.LayerDisclaimer)
				.AutoInclude();
		}
	}
}
