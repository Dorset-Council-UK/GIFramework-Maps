using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
	public class Basemap
    {
        public int Id { get; set; }
        [MaxLength(200)]
        public string? Name { get; set; }
		[Display(Name = "Preview image URL")]
		public string? PreviewImageURL { get; set; }
		public int LayerSourceId { get; set; }
		public LayerSource? LayerSource { get; set; }
		[Display(Name = "Max bounds")]
		public int? BoundId { get; set; }
		public Bound? Bound { get; set; }
		[Display(Name = "Maximum viewable zoom level")]
		public int MaxZoom { get; set; }
		[Display(Name = "Minimum viewable zoom level")]
		public int MinZoom { get; set; }
        //public List<VersionBasemap> VersionBasemaps { get; set; }
    }
}
