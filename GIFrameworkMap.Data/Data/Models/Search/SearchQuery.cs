using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.Search
{
	public class SearchQuery
    {
        public string? Query { get; set; }
        public List<RequiredSearch> Searches { get; set; } = new();
    }
}
