using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GIFrameworkMaps.Data.EntitiesConfiguration
{
	internal class WelcomeMessageConfiguration : IEntityTypeConfiguration<WelcomeMessage>
	{
		public void Configure(EntityTypeBuilder<WelcomeMessage> builder)
		{
			builder
				.Property(o => o.Frequency)
				.HasDefaultValue(-1);

			builder
				.Property(o => o.ModalSize)
				.HasDefaultValue("modal-lg");

			builder
				.Property(o => o.DismissOnButtonOnly)
				.HasDefaultValue(false);
		}
	}
}
