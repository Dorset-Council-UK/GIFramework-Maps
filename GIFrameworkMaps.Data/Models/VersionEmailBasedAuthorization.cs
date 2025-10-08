using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
	public class VersionEmailBasedAuthorization
	{
		public int VersionId { get; set; }
		public string EmailRegEx { get; set; } = string.Empty;
		public Version? Version { get; set; }
	}
}
