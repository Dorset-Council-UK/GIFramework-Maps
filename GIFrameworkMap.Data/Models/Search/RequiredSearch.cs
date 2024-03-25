namespace GIFrameworkMaps.Data.Models.Search
{
	public class RequiredSearch
    {
        public bool StopIfFound { get; set; }
        public bool Enabled { get; set; }
        public int Order { get; set; }
        public string? Name { get; set; }
        public int SearchDefinitionId { get; set; }
    }
}
