using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
	public class LayerDisclaimer
	{
		public int Id { get; set; }
		[Required]
		public string? Name { get; set; }
		[Required]
		[MaxLength(4000)]
		public string? Disclaimer { get; set; }
		[Required]
		public int Frequency { get; set; }
		[DisplayName("Dismiss Text")]
		[MaxLength(50)]
		public string? DismissText { get; set; }
	}
}
