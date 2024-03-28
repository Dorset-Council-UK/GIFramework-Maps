namespace GIFrameworkMaps.Data.Models
{
    public class VersionSearchDefinition
    {
        public int VersionId { get; set; }
        public int SearchDefinitionId { get; set; }
        public bool Enabled { get; set; }
        public bool StopIfFound { get; set; }
        public int Order { get; set; }
        public Version? Version { get; set; }
        public Search.SearchDefinition? SearchDefinition { get; set; }
    }
}
