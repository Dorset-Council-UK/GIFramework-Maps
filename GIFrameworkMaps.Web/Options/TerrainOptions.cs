namespace GIFrameworkMaps.Web
{
	public class TerrainOptions
	{
		public const string Terrain = "Terrain";
		public string CesiumIonApiKey { get; set; }
		public int CesiumIonAssetId { get; set; } = 1;
		public string CustomTerrainProviderTileJsonURL { get; set; }
	}
}
