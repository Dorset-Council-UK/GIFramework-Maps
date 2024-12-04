namespace GIFrameworkMaps.Web
{
	public class ApiKeyOptions
	{
		public const string ApiKeys = "ApiKeys";
		public GoogleOptions Google { get; set; }

		public class GoogleOptions
		{
			public string MapsApiKey { get; set; }
		}
	}
}
