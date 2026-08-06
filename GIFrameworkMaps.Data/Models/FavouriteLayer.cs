using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
	public class FavouriteLayer
	{
		public int Id { get; set; }
		[Required]
		public int LayerId { get; set; }
		[Required]
		public string UserId { get; set; } = null!;
	}
}
