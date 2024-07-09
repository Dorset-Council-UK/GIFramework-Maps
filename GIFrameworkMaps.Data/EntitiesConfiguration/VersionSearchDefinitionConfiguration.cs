using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class VersionSearchDefinitionConfiguration : IEntityTypeConfiguration<VersionSearchDefinition>
	{
		public void Configure(EntityTypeBuilder<VersionSearchDefinition> builder)
		{
			builder
				.HasKey(o => new { o.SearchDefinitionId, o.VersionId });
		}
	}
}
