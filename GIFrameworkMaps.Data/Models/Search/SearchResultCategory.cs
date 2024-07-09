using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.Search
{
	public class SearchResultCategory
    {
        public List<SearchResult> Results { get; set; } = [];
        public string? CategoryName { get; set; }
        public int Ordering { get; set; }
        public string? AttributionHtml { get; internal set; }
        public bool SupressGeom { get; set; }
    }
}
