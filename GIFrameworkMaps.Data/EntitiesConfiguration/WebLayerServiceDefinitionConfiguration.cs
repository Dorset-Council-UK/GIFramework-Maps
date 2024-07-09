using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class WebLayerServiceDefinitionConfiguration : IEntityTypeConfiguration<WebLayerServiceDefinition>
	{
		public void Configure(EntityTypeBuilder<WebLayerServiceDefinition> builder)
		{
			builder
				.Property(o => o.Type)
				.HasConversion<string>();
		}
	}
}
