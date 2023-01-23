using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data.Models.ViewModels
{
    public class BasemapViewModel
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsDefault { get; set; }
        public string PreviewImageURL { get; set; }
        public Bound Bound { get; set; }
        public int MaxZoom { get; set; }
        public int MinZoom { get; set; }
        public int DefaultOpacity { get; set; }
        public int DefaultSaturation { get; set; }
        public int SortOrder { get; set; }
        public LayerSource LayerSource { get; set; }

    }
}
