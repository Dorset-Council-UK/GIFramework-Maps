using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
	public class ProxyAllowedHost
    {
        public int Id { get; set; }
        [Required]
        public string? Host { get; set; }
    }
}
