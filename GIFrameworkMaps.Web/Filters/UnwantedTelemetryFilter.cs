using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;

namespace GIFrameworkMaps.Web.Filters
{
	public class UnwantedTelemetryFilter(ITelemetryProcessor next) : ITelemetryProcessor
	{
		private ITelemetryProcessor Next { get; set; } = next;

		public void Process(ITelemetry item)
		{
			if (item is RequestTelemetry request && request.Name != null)
				if (request.Name.Contains("broadcasthub"))
					return;

			// Send everything else:
			Next.Process(item);
		}
	}
}
