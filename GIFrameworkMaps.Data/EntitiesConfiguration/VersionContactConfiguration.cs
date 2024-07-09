using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionContactConfiguration : IEntityTypeConfiguration<VersionContact>
	{
		public void Configure(EntityTypeBuilder<VersionContact> builder)
		{
			builder
				.HasKey(o => new { o.VersionContactId, o.VersionId });
		}
	}
}
