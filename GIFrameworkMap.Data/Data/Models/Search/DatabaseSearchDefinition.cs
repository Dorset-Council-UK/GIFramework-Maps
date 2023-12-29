using System.ComponentModel;

namespace GIFrameworkMaps.Data.Models.Search
{
	public class DatabaseSearchDefinition : SearchDefinition
    {
        [DisplayName("Table name")]
        public string? TableName { get; set; }

        [DisplayName("X field")]
        public string? XField { get; set; }

        [DisplayName("Y field")]
        public string? YField { get; set; }

        [DisplayName("Geometry field")]
        public string? GeomField { get; set; }

        [DisplayName("Title field")]
        public string? TitleField { get; set; }

        [DisplayName("SQL WHERE clause")]
        public string? WhereClause { get; set; }

        [DisplayName("SQL ORDER BY clause (optional)")]
        public string? OrderByClause { get; set; }
    }
}
