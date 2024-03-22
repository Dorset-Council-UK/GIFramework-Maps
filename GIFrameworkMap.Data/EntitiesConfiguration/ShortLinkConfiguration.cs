using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class ShortLinkConfiguration : IEntityTypeConfiguration<ShortLink>
	{
		public void Configure(EntityTypeBuilder<ShortLink> builder)
		{
			builder
				.HasKey(o => new { o.ShortId });

			builder
				.Property(o => o.Created)
				.HasDefaultValueSql("CURRENT_TIMESTAMP");
		}
	}
}
