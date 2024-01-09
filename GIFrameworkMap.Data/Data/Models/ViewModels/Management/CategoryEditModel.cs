using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
	public class CategoryEditModel
    {
        public GIFrameworkMaps.Data.Models.Category? Category { get; set; }
        public SelectList? AvailableParentCategories { get; set; }

        public List<int> SelectedLayers { get; set; } = new();
        
        public List<Layer> AvailableLayers { get; set; } = new();

    }
}
