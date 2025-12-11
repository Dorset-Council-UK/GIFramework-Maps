using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionEmailBasedAuthorizationConfiguration : IEntityTypeConfiguration<VersionEmailBasedAuthorization>
	{
		public void Configure(EntityTypeBuilder<VersionEmailBasedAuthorization> builder)
		{
			builder
				.HasKey(o => new { o.EmailRegEx, o.VersionId });
		}
	}
}
