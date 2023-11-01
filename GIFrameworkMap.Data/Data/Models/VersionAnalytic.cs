using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class VersionAnalytic
    {
        public int VersionId { get; set; }
        public int AnalyticsDefinitionId { get; set; }
        public AnalyticsDefinition? AnalyticsDefinition { get; set; }
    }
}
