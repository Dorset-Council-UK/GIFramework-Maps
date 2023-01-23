using System;
using System.Collections.Generic;
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
        public string AttributionHtml { get; set; }
        public int? MaxResults { get; set; }
        public int? ZoomLevel { get; set; }
        public int EPSG { get; set; }
        public string ValidationRegex { get; set; }
        public bool SupressGeom { get; set; }
    }
}
