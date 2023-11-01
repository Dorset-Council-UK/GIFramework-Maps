using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
