using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
