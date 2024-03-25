using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models.Tour
{
	public class TourStep
    {
        public int Id { get; set; }

        [Required]
        public string? Title { get; set; }

        [Required]
        public string? Content { get; set; }

        [DisplayName("Name of the selector you would like the tour step to attach to (leave this blank and the tour step will float in the middle of the screen)")]
        public string? AttachToSelector { get; set; }

        [DisplayName("If you're attaching the step to a selector, where would you like it to attach?")]
        public string? AttachToPosition { get; set; }

        [DisplayName("Step order - enter a number")]
        public int StepNumber { get; set; }

        [Display(Name = "Tour to link step to")]
        public int TourDetailsId { get; set; }
    }
}
