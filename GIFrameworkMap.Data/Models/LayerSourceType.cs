using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{

	public class LayerSourceType
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string? Name { get; set; }
        public string? Description { get; set; }
    }
}
