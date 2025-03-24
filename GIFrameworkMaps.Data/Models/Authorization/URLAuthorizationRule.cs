namespace GIFrameworkMaps.Data.Models.Authorization
{
    public class URLAuthorizationRule
    {
		public int Id { get; set; }
		public required string Url { get; set; }
		public int Priority { get; set; }
		public AuthorizationType AuthorizationType { get; set; }
	}
}
