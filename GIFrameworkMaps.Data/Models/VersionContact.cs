using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GIFrameworkMaps.Data.Models
{
    public class VersionContact
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int VersionContactId { get; set; }
        public int VersionId { get; set; }
        [Display(Name = "Enable alerts for user")]
        public bool Enabled { get; set; }
        [Display(Name = "Contact name")]
        public string? DisplayName { get; set; }
        [Display(Name = "User")]
        public string? UserId { get; set; }
		public string? Email { get; set;  }
        public Version? Version { get; set; }
    }
}
