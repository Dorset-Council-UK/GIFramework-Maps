using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
    public class Theme
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        [DisplayName("Main theme colour")]
        public string PrimaryColour { get; set; }

        [DisplayName("URL for your logo")]
        public string LogoURL { get; set; }

        [DisplayName("URL for your custom favicon (this is optional)")]
        public string? CustomFaviconURL { get; set; }
    }
}
