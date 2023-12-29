namespace GIFrameworkMaps.Data.Models
{
	public class VersionCategory
    {
        public int VersionId { get; set; }
        public int CategoryId { get; set; }
        public Category? Category { get; set; }
    }
}
