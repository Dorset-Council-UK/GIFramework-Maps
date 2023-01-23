using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class SearchResults
    {
        public SearchResults()
        {
            ResultCategories = new List<SearchResultCategory>();
            TotalResults = 0;
            IsError = false;
        }
        public List<SearchResultCategory> ResultCategories { get; set; }
        public int TotalResults { get; set; }
        public bool IsError { get; set; }
    }
}
