using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class RequiredSearch
    {
        public bool StopIfFound { get; set; }
        public bool Enabled { get; set; }
        public int Order { get; set; }
        public SearchDefinition SearchDefinition { get; set; }
    }
}
