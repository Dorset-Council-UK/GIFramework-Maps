using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class AnalyticsAndCookieModel
    {
        public AnalyticsAndCookieModel()
        {
            //Ensure the lists are created when we create a new instance of the model
            AvailableAnalytics = new List<AnalyticsDefinition> { };
            AvailableCookieControl = new List<CookieControlDefinition> { };
        }
        public List<AnalyticsDefinition> AvailableAnalytics { get; set; }
        public List<CookieControlDefinition> AvailableCookieControl { get; set; }
    }
}
