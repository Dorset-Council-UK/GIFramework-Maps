using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class LayerWizardCreateSourceViewModel
    {
        public GIFrameworkMaps.Data.Models.LayerSource LayerSource { get; set; }
        public SelectList AvailableAttributions { get; set; }
        public SelectList AvailableLayerSourceTypes { get; set; }
        public string BaseURL { get; set; }
        public string LayerName { get; set; }
        public string EPSG { get; set; }
        public string Format { get; set; }
    }
}
