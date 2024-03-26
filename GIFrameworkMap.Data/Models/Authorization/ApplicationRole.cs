using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models.Authorization
{
	public class ApplicationRole
    {
        public int Id { get; set; }
        [MaxLength(200)]
        [Required]
        public string? RoleName { get; set; }
    }
}
