using System;
using System.Collections.Generic;
using System.Text;
using GIFrameworkMaps.Data.Models.Tour;

namespace GIFrameworkMaps.Data.Models.ViewModels
{
    public class VersionViewModel
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Slug { get; set; }
        public List<CategoryViewModel> Categories { get; set; }
        public List<BasemapViewModel> Basemaps { get; set; }
        public string HelpURL { get; set; }
        public string FeedbackURL { get; set; }
        public Theme Theme { get; set; }
        public Bound Bound { get; set; }
        public WelcomeMessage WelcomeMessage { get; set; }
        public TourDetails TourDetails { get; set; }
        public string AppRoot { get; set; }
        public string AppInsightsKey { get; set; }
        public string GoogleMapsAPIKey { get; set; }
    }
}
