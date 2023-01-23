using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.Tour
{
    public class TourDetails
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
        [DefaultValue(-1)]
        [Range(-1, int.MaxValue)]
        public int Frequency { get; set; }
        public DateTime UpdateDate { get; set; }
        public List<TourStep> Steps { get; set; }
    }
}
