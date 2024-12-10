namespace GIFrameworkMaps.Data.Models
{
	public class LayerDisclaimer
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required string Disclaimer { get; set; }
		public required int Frequency { get; set; } = -1;
		public string? DismissText { get; set; }
	}
}
