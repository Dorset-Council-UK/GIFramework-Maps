using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class LocalSearchDefinition : SearchDefinition
    {
        [DisplayName("Local search name")]
        public string? LocalSearchName { get; set; }
    }
}
