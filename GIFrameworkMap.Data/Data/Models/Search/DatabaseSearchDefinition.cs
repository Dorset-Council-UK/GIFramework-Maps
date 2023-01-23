using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class DatabaseSearchDefinition : SearchDefinition
    {
        public string TableName { get; set; }
        public string XField { get; set; }
        public string YField { get; set; }
        public string GeomField { get; set; }
        public string TitleField { get; set; }
        public string WhereClause { get; set; }
        public string OrderByClause { get; set; }
    }
}
