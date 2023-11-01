﻿using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class SearchResultCategory
    {
        public List<SearchResult> Results { get; set; } = new();
        public string? CategoryName { get; set; }
        public int Ordering { get; set; }
        public string? AttributionHtml { get; internal set; }
        public bool SupressGeom { get; set; }
    }
}
