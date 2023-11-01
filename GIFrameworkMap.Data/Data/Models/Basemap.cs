using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class Basemap
    {
        public int Id { get; set; }
        [MaxLength(200)]
        public string? Name { get; set; }
        public string? PreviewImageURL { get; set; }
        public LayerSource? LayerSource { get; set; }
        public Bound? Bound { get; set; }
        public int MaxZoom { get; set; }
        public int MinZoom { get; set; }
        //public List<VersionBasemap> VersionBasemaps { get; set; }
    }
}
