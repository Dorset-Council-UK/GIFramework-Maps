using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel;
using NodaTime;

namespace GIFrameworkMaps.Data.Models.Tour
{
    public class TourDetails
    {
        public int Id { get; set; }

        [Required]
        [DisplayName("Name of the tour")]
        public string Name { get; set; }

        [DefaultValue(-1)]
        [Range(-1, int.MaxValue)]
        [DisplayName("How often do you want the tour to display?")]
        public int Frequency { get; set; }

        [DisplayName("Update date")]
        public LocalDateTime UpdateDate { get; set; }

        public List<TourStep> Steps { get; set; }

    }
}
