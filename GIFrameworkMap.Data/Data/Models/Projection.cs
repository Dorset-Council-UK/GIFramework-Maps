namespace GIFrameworkMaps.Data.Models
{
	public class Projection
	{
		public int EPSGCode { get; set; }
		public required string Name { get; set; }
		public string? Description { get; set; }
		public string? Proj4Definition {  get; set; }	
		public decimal MinBoundX { get; set; }
		public decimal MinBoundY { get; set; }
		public decimal MaxBoundX { get; set; }
		public decimal MaxBoundY { get; set; }
		public int DefaultRenderedDecimalPlaces { get; set; }
	}
}
