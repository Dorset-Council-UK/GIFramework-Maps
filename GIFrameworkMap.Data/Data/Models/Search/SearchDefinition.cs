using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class SearchDefinition
    {
        public int Id { get; set; }

        [MaxLength(200)]
        public string Name { get; set; }

        [MaxLength(200)]
        public string Title { get; set; }

        [MaxLength(1000)]
        [DisplayName("Attribution HTML (optional)")]
        public string AttributionHtml { get; set; }

        [DisplayName("Maximum number of results to return")]
        public int? MaxResults { get; set; }

        [DisplayName("Zoom level you want the map to zoom to (optional)")]
        public int? ZoomLevel { get; set; }

        public int EPSG { get; set; }

        [DisplayName("Validation regex code (leave blank for no validation)")]
        public string ValidationRegex { get; set; }

        public bool SupressGeom { get; set; }
    }
}
