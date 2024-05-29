using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class LayerWizardCreateXYZSourceViewModel
	{
		public LayerSource? LayerSource { get; set; }
		public SelectList? AvailableAttributions { get; set; }

		[Display(Name = "URL Template")]
		public string? URLTemplate { get; set; }
		[Display(Name = "Projection (if not EPSG:3857)")]
		public string? Projection { get; set; }
		[Display(Name = "Custom tile grid")]
		public string? TileGrid { get; set; }
		[Display(Name = "Create as basemap?")]
		public bool CreateBasemap { get; set; }
	}
}
