using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class BasemapConfiguration : IEntityTypeConfiguration<Basemap>
	{
		public void Configure(EntityTypeBuilder<Basemap> builder)
		{
			builder
				.Navigation(o => o.Bound)
				.AutoInclude();

			builder
				.Navigation(o => o.LayerSource)
				.AutoInclude();
		}
	}
}
