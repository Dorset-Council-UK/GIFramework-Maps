using OpenTelemetry;
using System.Diagnostics;

namespace GIFrameworkMaps.Web.Filters
{
	public class UnwantedTelemetryFilter : BaseProcessor<Activity>
	{
		public override void OnEnd(Activity activity)
		{
			if (activity.Kind == ActivityKind.Server && activity.DisplayName.Contains("broadcasthub"))
				activity.ActivityTraceFlags &= ~ActivityTraceFlags.Recorded;
		}
	}
}
