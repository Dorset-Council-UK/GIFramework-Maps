using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
    public class VersionContact
    {
        public int VersionContactId { get; set; }
        public int VersionId { get; set; }
        [Display(Name = "Enable alerts for user")]
        public bool Enabled { get; set; }
        [Display(Name = "Contact Name")]
        public string DisplayName { get; set; }
        [Display(Name = "Contact Account")]
        public string UserId { get; set; }
        public Version Version { get; set; }
    }
}
