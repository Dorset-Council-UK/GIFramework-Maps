using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class LayerWizardCreateXYZSourceViewModel
    {
        public GIFrameworkMaps.Data.Models.LayerSource? LayerSource { get; set; }
        public SelectList? AvailableAttributions { get; set; }
        
        [Display(Name ="URL Template")]
        public string? URLTemplate { get; set; }
        [Display(Name ="Projection (if not EPSG:3857)")]
        public string? Projection { get; set; }
        [Display(Name ="Custom tile grid")]
        public string? TileGrid { get; set; }
    }
}
