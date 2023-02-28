using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class LayerSourceOptionEditModel
    {
        public GIFrameworkMaps.Data.Models.LayerSourceOption LayerSourceOption { get; set; }
        public GIFrameworkMaps.Data.Models.LayerSource LayerSource { get; set; }

    }
}
