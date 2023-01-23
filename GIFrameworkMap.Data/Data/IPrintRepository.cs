using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data
{
    public interface IPrintRepository
    {
        Models.VersionPrintConfiguration GetPrintConfigurationByVersion(int versionId);
    }
}
