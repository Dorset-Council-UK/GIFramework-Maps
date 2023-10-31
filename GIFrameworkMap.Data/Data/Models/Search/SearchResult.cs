using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class SearchResult
    {
        public string? DisplayText { get; set; }
        public decimal X { get; set; }
        public decimal Y { get; set; }
        public int? Zoom { get; set; }
        public decimal[]? Bbox { get; set; }
        public decimal Ordering { get; set; }
        public int EPSG { get; set; }
        public string? Geom { get; set; }
    }
}
