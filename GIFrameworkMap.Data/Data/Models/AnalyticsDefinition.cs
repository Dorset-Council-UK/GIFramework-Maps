using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Kiota.Http.Generated;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class AnalyticsDefinition
    {
        public int Id { get; set; }
        [Display(Name = "Name of Analytic product")]
        public string? ProductName { get; set; }
        [Display(Name = "Product Key or token")]
        public string? ProductKey { get; set; }
        [Display(Name = "Linked Cookie Control")]
        public string? CookieControl { get; set; }
        [Display(Name = "Date of last modification")]
        public DateTime DateModified { get; set; }
        [Display(Name = "Is analytic enabled?")]
        public bool Enabled { get; set; }
        public List<VersionAnalytic> VersionAnalytics { get; set; } = new();

    }
}
