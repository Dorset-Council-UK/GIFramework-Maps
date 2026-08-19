using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models.Search
{
	public class SearchDefinition
    {
        public int Id { get; set; }

        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(200)]
        public string? Title { get; set; }

        [MaxLength(1000)]
        [DisplayName("Attribution HTML (optional)")]
        public string? AttributionHtml { get; set; }

        [DisplayName("Maximum number of results to return")]
        public int? MaxResults { get; set; }

        [DisplayName("Zoom level you want the map to zoom to (optional)")]
        public int? ZoomLevel { get; set; }

        public int EPSG { get; set; }

        [DisplayName("Validation regex code (leave blank for no validation)")]
        public string? ValidationRegex { get; set; }

        [Range(SearchLengthLimits.GlobalMinLength, SearchLengthLimits.GlobalMaxLength)]
        [DisplayName("Minimum search text length (optional override, leave blank to use the global minimum)")]
        public int? MinSearchTextLength { get; set; }

        [Range(SearchLengthLimits.GlobalMinLength, SearchLengthLimits.GlobalMaxLength)]
        [DisplayName("Maximum search text length (optional override, leave blank to use the global maximum)")]
        public int? MaxSearchTextLength { get; set; }

        public bool SupressGeom { get; set; }
    }
}
