namespace GIFrameworkMaps.Data
{
	public interface IPrintRepository
    {
        Models.VersionPrintConfiguration GetPrintConfigurationByVersion(int versionId);
    }
}
