using System.ComponentModel;
using System.ComponentModel.DataAnnotations.Schema;

namespace GIFrameworkMaps.Data.Models
{
  public class VersionLayer
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int VersionId { get; set; }
        //Layer ID is unique per version as included in primary key!
        public int LayerId { get; set; }
        public int CategoryId { get; set; }
        [DisplayName("On by default")]
        public bool IsDefault { get; set; }
        [DisplayName("Default opacity")]
        public int? DefaultOpacity { get; set; }
        [DisplayName("Default saturation")]
        public int? DefaultSaturation { get; set; }
        [DisplayName("Minimum viewable zoom level")]
        public int? MinZoom { get; set; }
        [DisplayName("Maximum viewable zoom level")]
        public int? MaxZoom { get; set; }
        [DisplayName("Sort order within category")]
        public int? SortOrder { get; set; }
        //Foriegn references 
        public virtual Layer? Layer { get; set; }
        public virtual Category? Category { get; set; }
    }
}
