using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
        public bool IsDefault { get; set; }
        public int? DefaultOpacity { get; set; }
        public int? DefaultSaturation { get; set; }
        public int? MinZoom { get; set; }
        public int? MaxZoom { get; set; }
        public int? SortOrder { get; set; }
        //Foriegn references 
        public virtual Layer Layer { get; set; }
        public virtual Category Category { get; set; }
    }
}
