using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class VersionBasemap
    {
        public int VersionId { get; set; }
        public int BasemapId { get; set; }
        public bool IsDefault { get; set; }
        public int DefaultOpacity { get; set; }
        public int DefaultSaturation { get; set; }
        public int SortOrder { get; set; }
        public Basemap Basemap { get; set; }
    }
}
