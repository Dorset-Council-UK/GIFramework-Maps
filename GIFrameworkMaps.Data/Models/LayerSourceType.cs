using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GIFrameworkMaps.Data.Models
{

	public class LayerSourceType
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string? Name { get; set; }
		[JsonIgnore]
        public string? Description { get; set; }
    }
}
