using GIFrameworkMaps.Data.Models;
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
        public LayerSourceOption? LayerSourceOption { get; set; }
        public LayerSource? LayerSource { get; set; }

    }
}
