using System;
using System.Collections.Generic;
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
        public int? MinZoom { get; set; }
        public int? MaxZoom { get; set; }
        public Bound? Bound { get; set; }
        public int ZIndex { get; set; }
        public int DefaultOpacity { get; set; }
        public int DefaultSaturation { get; set; }
        public bool Queryable { get; set; }
        public string? InfoTemplate { get; set; }
        public string? InfoListTitleTemplate { get; set; }
        public bool Filterable { get; set; } = true;
        public bool DefaultFilterEditable { get; set; } = false;
        public bool ProxyMetaRequests { get; set; }
        public bool ProxyMapRequests { get; set; }
        public LayerSource LayerSource { get; set; }
        //public virtual List<Category> Categories { get; set; }

    }
}
