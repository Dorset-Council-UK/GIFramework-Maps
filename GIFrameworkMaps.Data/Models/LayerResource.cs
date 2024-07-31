using System.Text.Json.Serialization;

namespace GIFrameworkMaps.Data.Models
{
	public class LayerResource
	{
		[JsonPropertyName("name")]
		public string? Name { get; set; }
		[JsonPropertyName("title")]
		public string? Title { get; set; }
		[JsonPropertyName("abstract")]
		public string? Abstract { get; set; }
		[JsonPropertyName("attribution")]
		public string? Attribution { get; set; }
		[JsonPropertyName("formats")]
		public string[] Formats { get; set; } = [];
		[JsonPropertyName("baseUrl")]
		public string? BaseUrl { get; set; }
		[JsonPropertyName("projection")]
		public string[] Projections { get; set; } = [];
		[JsonPropertyName("extent")]
		public string[] Extent { get; set; } = [];
		[JsonPropertyName("version")]
		public string? Version { get; set; }
		[JsonPropertyName("proxyMetaRequests")]
		public bool ProxyMetaRequests { get; set; }
		[JsonPropertyName("proxyMapRequests")]
		public bool ProxyMapRequests { get; set; }
	}
}
