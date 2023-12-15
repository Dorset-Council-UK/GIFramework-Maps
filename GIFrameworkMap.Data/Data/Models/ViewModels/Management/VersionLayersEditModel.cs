using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class VersionLayersEditModel
    {
        public int VersionId { get; set; }
        public List<VersionLayer> VersionLayers {  get; set; }

        public virtual Version? Version { get; set; }
    }
}
