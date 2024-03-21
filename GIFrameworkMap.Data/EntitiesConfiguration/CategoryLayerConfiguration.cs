using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class CategoryLayerConfiguration : IEntityTypeConfiguration<CategoryLayer>
	{
		public void Configure(EntityTypeBuilder<CategoryLayer> builder)
		{
			builder
				.HasKey(o => new { o.CategoryId, o.LayerId });
		}
	}
}
