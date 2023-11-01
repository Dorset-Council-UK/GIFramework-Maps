using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class LayerCreateModel
    {
        public GIFrameworkMaps.Data.Models.Layer? Layer { get; set; }
        public SelectList? AvailableBounds { get; set; }
    }
}
