using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class TourDetailsConfiguration : IEntityTypeConfiguration<TourDetails>
	{
		public void Configure(EntityTypeBuilder<TourDetails> builder)
		{
			builder
				.Property(o => o.Frequency)
				.HasDefaultValue(-1);
		}
	}
}
