using System;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
	public class Layer
    {
        public int Id { get; set; }
        [MaxLength(200)]
        public string? Name { get; set; }
        [Display(Name = "Minimum viewable zoom level (optional)")]
        public int? MinZoom { get; set; }
        [Display(Name = "Maximum viewable zoom level (optional)")]
        public int? MaxZoom { get; set; }
        [Display(Name= "Restricted bounds (optional)")]
        public int? BoundId { get; set; }
        public Bound? Bound { get; set; }
        [Display(Name = "Layer Z-Index")]
        public int ZIndex { get; set; }
        [Display(Name = "Default Opacity")]
        [Range(0, 100)]
        public int DefaultOpacity { get; set; } = 100;
        [Display(Name = "Default Saturation")]
        [Range(0, 100)]
        public int DefaultSaturation { get; set; } = 100;
        public bool Queryable { get; set; } = true;
        [Display(Name = "Info Template")]
        public string? InfoTemplate { get; set; }
        [Display(Name = "Info List Template")]
        public string? InfoListTitleTemplate { get; set; }
        public bool Filterable { get; set; } = true;
        [Display(Name = "Default filter is editable")]
        public bool DefaultFilterEditable { get; set; } = false;
        [Display(Name = "Proxy Metadata Requests")]
        public bool ProxyMetaRequests { get; set; }
        [Display(Name = "Proxy Map Requests")]
        public bool ProxyMapRequests { get; set; }
		[Display(Name = "Refresh Interval (seconds)")]
		[Range(0, 3600, ErrorMessage = "Refresh interval must be between 0 and 3600 seconds. A value of 0 means no refresh.")]
		public int? RefreshInterval { get; set; } // in seconds, null or 0 means no refresh
		public int LayerSourceId { get; set; }
		[Display(Name="Disclaimer (optional)")]
		public int? LayerDisclaimerId { get; set; }
		public LayerSource? LayerSource { get; set; }
		public LayerDisclaimer? LayerDisclaimer { get; set; }
		//public virtual List<Category> Categories { get; set; }

	}
}
