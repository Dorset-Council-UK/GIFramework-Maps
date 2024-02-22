namespace GIFrameworkMaps.Data.Models
{
	public class VersionProjection
	{
		public int VersionId { get; set; }
		public int ProjectionId { get; set; }
		public bool IsDefaultMapProjection { get; set; }
		public bool IsDefaultViewProjection {  get; set; }
		public required Projection Projection { get; set; }
    }
}
