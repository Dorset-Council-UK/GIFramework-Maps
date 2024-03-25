using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class LayerSourceEditViewModel
	{
		public LayerSource? LayerSource { get; set; }
		public IList<Layer> LayersUsingSource { get; set; } = [];
		public SelectList? AvailableAttributions { get; set; }
		public SelectList? AvailableLayerSourceTypes { get; set; }
	}
}
