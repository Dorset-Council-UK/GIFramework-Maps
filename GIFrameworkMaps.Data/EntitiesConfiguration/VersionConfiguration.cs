using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionConfiguration : IEntityTypeConfiguration<Version>
	{
		public void Configure(EntityTypeBuilder<Version> builder)
		{
			builder
				.Navigation(o => o.Bound)
				.AutoInclude();

			builder
				.Navigation(o => o.Theme)
				.AutoInclude();

			builder
				.Navigation(o => o.TourDetails)
				.AutoInclude();

			builder
				.Navigation(o => o.VersionBasemaps)
				.AutoInclude();

			builder
				.Navigation(o => o.VersionCategories)
				.AutoInclude();

			builder
				.Navigation(o => o.VersionLayerCustomisations)
				.AutoInclude();

			builder
				.Navigation(o => o.VersionProjections)
				.AutoInclude();

			builder
				.Navigation(o => o.WelcomeMessage)
				.AutoInclude();
		}
	}
}
