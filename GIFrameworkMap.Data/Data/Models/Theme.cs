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

        [RegularExpression("(https?:\\/\\/)([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)")]
        [DisplayName("URL for your logo")]
        public string LogoURL { get; set; }

        [RegularExpression("(https?:\\/\\/)([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)")]
        [DisplayName("URL for your custom favicon (this is optional)")]
        public string? CustomFaviconURL { get; set; }
    }
}
