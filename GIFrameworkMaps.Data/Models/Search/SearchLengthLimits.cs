namespace GIFrameworkMaps.Data.Models.Search
{
	/// <summary>
	/// Global limits for search query text length. Individual <see cref="SearchDefinition"/>
	/// overrides can only tighten these bounds, never relax them.
	/// </summary>
	public static class SearchLengthLimits
	{
		public const int GlobalMinLength = 2;
		public const int GlobalMaxLength = 500;
	}
}
