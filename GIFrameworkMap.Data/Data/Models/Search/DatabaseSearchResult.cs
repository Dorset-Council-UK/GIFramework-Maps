using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    [NotMapped]
    public class DatabaseSearchResult
    {
        public string? GeomField { get; set; }
        public double? XField { get; set; }
        public double? YField { get; set; }
        public string? TitleField { get; set; }

    }
}
