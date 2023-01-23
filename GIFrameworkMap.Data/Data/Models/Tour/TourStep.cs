using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.Tour
{
    public class TourStep
    {
        public int Id { get; set; }
        [Required]
        public string Title { get; set; }
        [Required]
        public string Content { get; set; }
        public string AttachToSelector { get; set; }
        public string AttachToPosition { get; set; }
        public int StepNumber { get; set; }
    }
}
