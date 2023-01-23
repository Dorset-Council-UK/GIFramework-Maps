using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data.Models
{
    public class Attribution
    {
        private string _attributionHtml;

        public int Id { get; set; }
        public string Name { get; set; }
        public string AttributionHTML
        {
            get => _attributionHtml;
            set => _attributionHtml = value.Replace("{{CURRENT_YEAR}}",DateTime.Now.Year.ToString());
        }
    }
}
