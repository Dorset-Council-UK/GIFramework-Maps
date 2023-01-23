using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class SearchQuery
    {
        public string Query { get; set; }
        public List<RequiredSearch> Searches { get; set; }
    }
}
