namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class CustomiseLayerEditModel
    {
        public required Version Version { get; set; }
        public required Layer Layer { get; set; }
        public required Category Category { get; set; }
        public VersionLayer? LayerCustomisation { get; set; }
    }
}
