using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
	public class LayerSourceEditModel
    {
        public LayerSource? LayerSource { get; set; }
        public List<Layer> LayersUsingSource { get; set; } = new();
        public SelectList? AvailableAttributions { get; set; }
        public SelectList? AvailableLayerSourceTypes { get; set; }
    }
}
