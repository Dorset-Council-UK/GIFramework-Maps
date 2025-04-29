namespace GIFrameworkMaps.Web.Models
{
	public class RefreshResponseModel
	{
		public string access_token { get; set; }
		public string id_token { get; set; }
		public string token_type { get; set; }
		public int not_before { get; set; }
		public int expires_in { get; set; }
		public int expires_on { get; set; }
		public string resource { get; set; }
		public int id_token_expires_in { get; set; }
		public string profile_info { get; set; }
		public string scope { get; set; }
		public string refresh_token { get; set; }
		public int refresh_token_expires_in { get; set; }
	}
}


