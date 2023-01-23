using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
    public class Theme
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string Name { get; set; }
        public string Description { get; set; }
        public string PrimaryColour { get; set; }
        public string LogoURL { get; set; }
        public string? CustomFaviconURL { get; set; }
    }
}
