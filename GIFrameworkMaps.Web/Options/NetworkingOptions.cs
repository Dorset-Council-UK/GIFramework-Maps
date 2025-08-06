namespace GIFrameworkMaps.Web
{
	public class NetworkingOptions
	{
		public const string Networking = "Networking";

		public bool UseForwardedHeadersMiddleware { get; set; }
		public string[] KnownProxies { get; set; }
	}
}
