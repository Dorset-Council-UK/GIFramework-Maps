using NodaTime;
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
    public class WelcomeMessage
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string? Name { get; set; }

        [Required]
        public string? Title { get; set; }

        [Required]
        public string? Content { get; set; }

        [DefaultValue(-1)]
        [Range(-1, int.MaxValue)]
        [DisplayName("How often do you want the welcome message to show?")]
        public int Frequency { get; set; }

        [DisplayName("Update date")]
        public LocalDateTime UpdateDate { get; set; }

        [DefaultValue("modal-lg")]
        [DisplayName("How large do you want your welcome message to be?")]
        public string? ModalSize { get; set; }

        [DisplayName("Dismiss button text")]
        public string? DismissText{ get; set; }

        public bool DismissOnButtonOnly { get; set; }
    }
}
