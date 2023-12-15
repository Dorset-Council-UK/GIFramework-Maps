using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class WebLayerServiceDefinition
    {
        public int Id { get; set; }

        [Required]
        public string? Name { get; set; }

        [DisplayName("Description (optional)")]
        public string? Description { get; set; }

        [Required]
        [DisplayName("URL")]
        [RegularExpression("(https?:\\/\\/)([\\w\\-])+\\.{1}([a-zA-Z]{2,63})([\\/\\w-]*)*\\/?\\??([^#\\n\\r]*)?#?([^\\n\\r]*)")]
        public string? Url { get; set; }

        [Required]
        public ServiceType Type { get; set; }

        [DisplayName("Version (optional)")]
        public string? Version { get; set; }

        [DisplayName("Category (optional)")]
        public string? Category { get; set; }

        [Required]
        [DisplayName("Sort order")]
        public int SortOrder { get; set; }

        public bool ProxyMetaRequests { get; set; }

        public bool ProxyMapRequests { get; set; }

        public bool AdminOnly { get; set; }
    }

    public enum ServiceType
    {
        WMS,
        WFS,
        OWS,
        WMTS
    }
}
