using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
	public class Projection
	{
		public int EPSGCode { get; set; }
		public required string Name { get; set; }
		public string? Description { get; set; }
		[Display(Name="Proj4 or WKT Definition")]
		public string? Proj4Definition {  get; set; }
		[Display(Name = "Bottom Left X (Min X)")]
		public decimal MinBoundX { get; set; }
		[Display(Name = "Bottom Left Y (Min Y)")]
		public decimal MinBoundY { get; set; }
		[Display(Name = "Top Right X (Max X)")]
		public decimal MaxBoundX { get; set; }
		[Display(Name = "Top Right Y (Max Y)")]
		public decimal MaxBoundY { get; set; }
		[Display(Name = "Default display decimal places")]
		public int DefaultRenderedDecimalPlaces { get; set; }
	}
}
