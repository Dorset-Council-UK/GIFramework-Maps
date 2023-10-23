using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
    public class Bound
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string? Name { get; set; }

        [Required]
        public string? Description { get; set; }

        [Required]
        [DisplayName ("Bottom left X co-ordinate")]
        [Range(-20037508.34, 20037508.34)]
        public decimal BottomLeftX { get; set; }

        [Required]
        [DisplayName("Bottom left Y co-ordinate")]
        [Range(-20048966.1, 20048966.1)]
        public decimal BottomLeftY { get; set; }

        [Required]
        [DisplayName("Top right X co-ordinate")]
        [Range(-20037508.34, 20037508.34)]
        public decimal TopRightX { get; set; }

        [Required]
        [DisplayName("Top right Y co-ordinate")]
        [Range(-20048966.1, 20048966.1)]
        public decimal TopRightY { get; set; }

    }
}
