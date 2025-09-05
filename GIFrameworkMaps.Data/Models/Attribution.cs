using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GIFrameworkMaps.Data.Models
{
	public class Attribution
    {
        public int Id { get; set; }
        [Required]
        public string? Name { get; set; }
        [Display(Name="Attribution HTML")]
        [Required]
		[JsonIgnore]
        public string? AttributionHTML { get; set; }
        [NotMapped]
        public string? RenderedAttributionHTML
        {
            get => AttributionHTML?.Replace("{{CURRENT_YEAR}}", DateTime.Now.Year.ToString());
        }
    }
}
