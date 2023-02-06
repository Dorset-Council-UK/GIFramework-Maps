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
            VersionUsers = new List<VersionUser>();
        }
        public int Id { get; set; }
        [MaxLength(100)]
        public string Name { get; set; }
        public string Description { get; set; }
        [MaxLength(50)]
        public string Slug { get; set; }
        public bool Enabled { get; set; }
        public bool RequireLogin { get; set; }
        public bool ShowLogin { get; set; }
        public string RedirectionURL { get; set; }
        public string HelpURL { get; set; }
        public string FeedbackURL { get; set; }
        public List<VersionUser> VersionUsers { get; set; }
        public Bound Bound { get; set; }
        public Theme Theme { get; set; }
        public WelcomeMessage WelcomeMessage { get; set; }
        public TourDetails TourDetails { get; set; }
        public List<VersionBasemap> VersionBasemaps { get; set; }
        public List<VersionCategory> VersionCategories { get; set; }
    }
}
