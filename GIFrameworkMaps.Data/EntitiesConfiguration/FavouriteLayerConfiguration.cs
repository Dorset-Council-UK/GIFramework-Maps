using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class FavouriteLayerConfiguration : IEntityTypeConfiguration<FavouriteLayer>
	{
		public void Configure(EntityTypeBuilder<FavouriteLayer> builder)
		{
			builder.HasKey(fl => new { fl.LayerId, fl.UserId });
		}
	}
}
