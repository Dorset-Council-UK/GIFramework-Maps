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
    public class VersionEditModel
    {
        public GIFrameworkMaps.Data.Models.Version Version { get; set; }
        public SelectList AvailableThemes { get; set; }
        public SelectList AvailableBounds { get; set; }
        public SelectList AvailableTours { get; set; }
        public SelectList AvailableWelcomeMessages { get; set; }
        [Display(Name="Purge memory cache on save?")]
        public bool PurgeCache { get; set; }
    }
}
