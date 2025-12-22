using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GIFrameworkMaps.Data.Models
{
	/// <summary>
	/// Defines a single source of data and related options
	/// </summary>
	public class LayerSource
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string? Name { get; set; }
		[JsonIgnore]
		public string? Description { get; set; }
		[Display(Name = "Minimum source zoom level (optional)")]
		public int? MinZoom { get; set; }
		[Display(Name = "Maximum source zoom level (optional)")]
		public int? MaxZoom { get; set; }
		[Display(Name="Attribution")]
        public int AttributionId { get; set; }
        public Attribution? Attribution { get; set; }
        [Display(Name = "Layer Type")]
        public int LayerSourceTypeId { get; set; }
        public LayerSourceType? LayerSourceType { get; set; }
        public List<LayerSourceOption> LayerSourceOptions { get; set; } = [];
    }
}
