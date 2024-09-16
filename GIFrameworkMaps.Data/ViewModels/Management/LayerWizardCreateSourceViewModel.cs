using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class LayerWizardCreateSourceViewModel
	{
		public LayerSource? LayerSource { get; set; }
		public SelectList? AvailableAttributions { get; set; }
		public SelectList? AvailableLayerSourceTypes { get; set; }
		[Display(Name = "Base URL")]
		public string? BaseURL { get; set; }
		[Display(Name = "Layer Name")]
		public string? LayerName { get; set; }
		public string? Projection { get; set; }
		public string? Format { get; set; }
		public string? Version { get; set; }
		public ServiceType ServiceType { get; set; }
		[BindNever]
		public HtmlString? ServiceAttribution { get; set; }
		public bool AttributionMatched { get; set; }
		[Display(Name = "Require use of proxy?")]
		public bool UseProxy { get; set; }
		[Display(Name ="Create as basemap?")]
		public bool CreateBasemap { get; set; }
	}
}
