using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
    public class WelcomeMessage
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string Name { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        [DefaultValue(-1)]
        [Range(-1, int.MaxValue)]
        public int Frequency { get; set; }
        public DateTime UpdateDate { get; set; }
        public string DismissText{ get; set; }
        public Boolean DismissOnButtonOnly { get; set; }
    }
}
