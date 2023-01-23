using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public  class VersionPrintConfiguration
    {
        public int VersionId { get; set; }
        public int PrintConfigurationId { get; set; }
        public Version Version { get; set; }
        public Print.PrintConfiguration PrintConfiguration { get; set; }
    }
}
