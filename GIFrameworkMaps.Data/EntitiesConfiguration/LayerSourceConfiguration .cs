using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class LayerSourceConfiguration : IEntityTypeConfiguration<LayerSource>
	{
		public void Configure(EntityTypeBuilder<LayerSource> builder)
		{
			builder
				.Navigation(o => o.LayerSourceOptions)
				.AutoInclude();

			builder
				.Navigation(o => o.LayerSourceType)
				.AutoInclude();

			builder
				.Navigation(o => o.Attribution)
				.AutoInclude();
		}
	}
}
