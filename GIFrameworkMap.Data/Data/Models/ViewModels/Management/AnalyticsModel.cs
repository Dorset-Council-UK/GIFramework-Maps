using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class AnalyticsViewModel
    {
        public AnalyticsViewModel()
        {
            //Ensure the lists are created when we create a new instance of the model
            AvailableAnalytics = new List<AnalyticsDefinition> { };
        }
        public List<AnalyticsDefinition> AvailableAnalytics { get; set; }
        public int VersionID { get; set; }
    }

    public class AnalyticsEditModel
    {
        public AnalyticsDefinition? AnalyticDefinition { get; set; }
        public SelectList? AvailableProducts { get; set; }
        public SelectList? AvailableCookieControl { get; set; }

        public List<int> SelectedVersions { get; set; } = new();
        public List<Version> AvailableVersions { get; set; } = new();
    }
}
