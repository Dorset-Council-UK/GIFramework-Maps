using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class Layer
    {
        public int Id { get; set; }
        [MaxLength(200)]
        public string Name { get; set; }
        [Display(Name = "Minimum viewable zoom level (optional)")]
        public int? MinZoom { get; set; }
        [Display(Name = "Maximum viewable zoom level (optional)")]
        public int? MaxZoom { get; set; }
        [Display(Name= "Restricted bounds (optional)")]
        public int? BoundId { get; set; }
        public Bound? Bound { get; set; }
        [Display(Name = "Layer Z-Index")]
        public int ZIndex { get; set; }
        [Display(Name = "Default Opacity")]
        [Range(0, 100)]
        public int DefaultOpacity { get; set; } = 100;
        [Display(Name = "Default Saturation")]
        [Range(0, 100)]
        public int DefaultSaturation { get; set; } = 100;
        public bool Queryable { get; set; } = true;
        [Display(Name = "Info Template")]
        public string? InfoTemplate { get; set; }
        [Display(Name = "Info List Template")]
        public string? InfoListTitleTemplate { get; set; }
        public bool Filterable { get; set; } = true;
        [Display(Name = "Default filter is editable")]
        public bool DefaultFilterEditable { get; set; } = false;
        [Display(Name = "Proxy Metadata Requests")]
        public bool ProxyMetaRequests { get; set; }
        [Display(Name = "Proxy Map Requests")]
        public bool ProxyMapRequests { get; set; }
        public int LayerSourceId { get; set; }
        public LayerSource LayerSource { get; set; }
        //public virtual List<Category> Categories { get; set; }

    }
}
