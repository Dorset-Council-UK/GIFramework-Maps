namespace GIFrameworkMaps.Data.ViewModels.Management
{
    public class VersionDeleteUserViewModel
    {
        public int VersionId { get; set; }
        public required string VersionName { get; set; }
        public string? UserId { get; set; }
        public string? UserDisplayName { get; set; }
		public string? UserPrimaryEmail { get; set; }
    }
}
