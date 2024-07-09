using GIFrameworkMaps.Data.Models.Tour;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class TourDetailConfiguration : IEntityTypeConfiguration<TourDetail>
	{
		public void Configure(EntityTypeBuilder<TourDetail> builder)
		{
			builder
				.Property(o => o.Frequency)
				.HasDefaultValue(-1);

			builder
				.Navigation(o => o.Steps)
				.AutoInclude();
		}
	}
}
