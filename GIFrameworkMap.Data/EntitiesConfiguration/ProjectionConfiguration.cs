using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class ProjectionConfiguration : IEntityTypeConfiguration<Projection>
	{
		public void Configure(EntityTypeBuilder<Projection> builder)
		{
			builder
				.HasKey(o => o.EPSGCode);
		}
	}
}
