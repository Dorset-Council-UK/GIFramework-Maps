using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class LayerDisclaimerConfiguration : IEntityTypeConfiguration<LayerDisclaimer>
	{
		public void Configure(EntityTypeBuilder<LayerDisclaimer> builder)
		{
			builder
				.Property(o => o.Disclaimer)
				.IsRequired()
				.HasMaxLength(4000);
			builder
				.Property(o => o.Frequency)
				.HasDefaultValue(-1);
		}
	}
}
