using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;
using GIFrameworkMaps.Data.Models.Tour;

namespace GIFrameworkMaps.Data.Models
{
    public class Version
    {
        public Version()
        {
            Enabled= true;
            ShowLogin= true;
            VersionUsers = new List<VersionUser>();
        }
        public int Id { get; set; }
        [Required]
        [MaxLength(100)]
        public string Name { get; set; }
        [Display(Name = "Description (optional)")]
        public string Description { get; set; }
        [Required]
        [MaxLength(50)]
        public string Slug { get; set; }
        public bool Enabled { get; set; }
        [Display(Name="Require Login")]
        public bool RequireLogin { get; set; }
        [Display(Name = "Show login option")]
        public bool ShowLogin { get; set; }
        [Display(Name = "Redirection URL (optional)")]
        public string RedirectionURL { get; set; }
        [Display(Name = "Help URL (optional)")]
        public string HelpURL { get; set; }
        [Display(Name = "Feedback URL (optional)")]
        public string FeedbackURL { get; set; }
        [Display(Name="Theme")]
        public int ThemeId { get; set; }
        [Display(Name = "Start extents")]
        public int BoundId { get; set; }
        [Display(Name = "Welcome Message (optional)")]
        public int? WelcomeMessageId { get; set; }
        [Display(Name = "Tour (optional)")]
        public int? TourDetailsId { get; set; }
        [Display(Name = "Version Notes (optional)"), MaxLength(500)]
        public string VersionNotes { get; set; }
        public List<VersionUser> VersionUsers { get; set; }
        public List<VersionBasemap> VersionBasemaps { get; set; }
        public List<VersionCategory> VersionCategories { get; set; }
        public List<VersionAnalytic> VersionAnalytics { get; set; }
        public List<VersionContact> VersionContacts { get; set; }
        //navigation properties
        public virtual Bound Bound { get; set; }
        public virtual Theme Theme { get; set; }
        public virtual WelcomeMessage WelcomeMessage { get; set; }
        public virtual TourDetails TourDetails { get; set; }

    }
}
