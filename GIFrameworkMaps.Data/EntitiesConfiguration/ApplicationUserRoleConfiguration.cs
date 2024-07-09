using GIFrameworkMaps.Data.Models.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class ApplicationUserRoleConfiguration : IEntityTypeConfiguration<ApplicationUserRole>
	{
		public void Configure(EntityTypeBuilder<ApplicationUserRole> builder)
		{
			builder
				.HasKey(o => new { o.UserId, o.ApplicationRoleId });
		}
	}
}
