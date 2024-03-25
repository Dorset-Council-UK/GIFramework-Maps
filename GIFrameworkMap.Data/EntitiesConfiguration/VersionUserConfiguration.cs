using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionUserConfiguration : IEntityTypeConfiguration<VersionUser>
	{
		public void Configure(EntityTypeBuilder<VersionUser> builder)
		{
			builder
				.HasKey(o => new { o.UserId, o.VersionId });
		}
	}
}
