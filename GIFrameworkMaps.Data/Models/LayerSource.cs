using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

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
        public string? Description { get; set; }
        [Display(Name="Attribution")]
        public int AttributionId { get; set; }
        public Attribution? Attribution { get; set; }
        [Display(Name = "Layer Type")]
        public int LayerSourceTypeId { get; set; }
        public LayerSourceType? LayerSourceType { get; set; }
        public List<LayerSourceOption> LayerSourceOptions { get; set; } = [];
    }
}
