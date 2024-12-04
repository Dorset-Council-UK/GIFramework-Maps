namespace GIFrameworkMaps.Web
{
	public class GIFrameworkMapsOptions
	{
		public const string GIFrameworkMaps = "GIFrameworkMaps";
		public string appName { get; set; }
		public bool UseHttpsRedirection { get; set; }
		public string ToSLink { get; set; }
		public string PrivacyLink { get; set; }
		public string AdminDocsLink { get; set; }
		public string MapServicesAccessURL { get; set; }
		public bool AuthenticateWithMapServices { get; set; }
		public string PreferredProjections { get; set; }
		public bool HideEmbedOption { get; set; }
		public bool SuppressXFrameOptions { get; set; }
		public string AppAccessRequestLink { get; set; }
	}
}
