using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace GIFrameworkMaps.Data.Models.Search
{
    public class APISearchDefinition : SearchDefinition
    {
        [DisplayName("URL template")]
        public string? URLTemplate { get; set; }

        [DisplayName("X field path")]
        public string? XFieldPath { get; set; }

        [DisplayName("Y field path")]
        public string? YFieldPath { get; set; }

        [DisplayName("Title field path")]
        public string? TitleFieldPath { get; set; }

        [DisplayName("Geometry field path")]
        public string? GeomFieldPath { get; set; }

        [DisplayName("Minimum bounding rectangle X path")]
        public string? MBRXMinPath { get; set; }

        [DisplayName("Minimum bounding rectangle Y path")]
        public string? MBRYMinPath { get; set; }

        [DisplayName("Maximum bounding rectangle X path")]
        public string? MBRXMaxPath { get; set; }

        [DisplayName("Maximum bounding rectangle Y path")]
        public string? MBRYMaxPath { get; set; }
    }
}
