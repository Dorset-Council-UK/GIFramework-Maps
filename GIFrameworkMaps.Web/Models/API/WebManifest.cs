using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace GIFrameworkMaps.Web.Models.API
{
    /// <summary>
    /// A representation of a web manifest file
    /// </summary>
    public record ManifestFile
    {
        public string Id { get; init; }
        [property: JsonPropertyName("start_url")]
        public string StartURL { get; init; }
        [property: JsonPropertyName("name")]
        public string Name { get; init; }
        [property: JsonPropertyName("short_name")]
        public string ShortName { get; init; }
        public List<ManifestIcon> Icons { get; init; }
        [property: JsonPropertyName("theme_color")]
        public string ThemeColor { get; init; }
        public string Display { get; init; }
    }

    public record ManifestIcon
    {
        [property: JsonPropertyName("src")]
        public string Source { get; init; }
        public string Sizes { get; init; }
        public string Type { get; init; }
    }
}
