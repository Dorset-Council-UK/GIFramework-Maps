using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class AnalyticsDefinition
    {
        public int Id { get; set; }
        public string ProductName { get; set; }
        public string ProductKey { get; set; }
        public DateTime DateModified { get; set; }
        public bool Enabled { get; set; }
    }

    public class AnalyticsEditModel
    {
        public AnalyticsEditModel() {
            string[] supportedProducts = { "Cloudflare", "Google Analytics (GA4)", "Mirosoft Clarity" };
            availableProducts = new SelectList(supportedProducts);
        }
        public AnalyticsDefinition analyticDefinition { get; set; }
        public SelectList availableProducts { get; set; }
    }
}
