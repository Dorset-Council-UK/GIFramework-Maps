using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class APISearchDefinition : SearchDefinition
    {
        public string URLTemplate { get; set; }
        public string XFieldPath { get; set; }
        public string YFieldPath { get; set; }
        public string TitleFieldPath { get; set; }
        public string GeomFieldPath { get; set; }
        public string MBRXMinPath { get; set; }
        public string MBRYMinPath { get; set; }
        public string MBRXMaxPath { get; set; }
        public string MBRYMaxPath { get; set; }
    }
}
