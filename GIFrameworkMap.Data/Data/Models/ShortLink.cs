using NodaTime;
using System.ComponentModel.DataAnnotations.Schema;

namespace GIFrameworkMaps.Data.Models
{
    public class ShortLink
    {
        public string? ShortId { get; set; }
        public string? FullUrl { get; set; }
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public Instant Created { get; set; }
        public Instant? LastVisited { get; set; }
    }
}
