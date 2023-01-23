using System;
using System.Collections.Generic;
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
        public string Name { get; set; }
        public string Description { get; set; }
        [Required]
        public string Url { get; set; }
        [Required]
        public ServiceType Type { get; set; }
        public string Version { get; set; }
        public string Category { get; set; }
        [Required]
        public int SortOrder { get; set; }
    }

    public enum ServiceType
    {
        WMS,
        WFS,
        OWS,
        WMTS
    }
}
