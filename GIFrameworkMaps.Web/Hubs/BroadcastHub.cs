using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.ApplicationInsights;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace GIFrameworkMaps.Web.Hubs
{
	public class BroadcastHub(TelemetryClient telemetry, IHttpContextAccessor httpContextAccessor) : Hub
    {
        private readonly TelemetryClient _telemetry = telemetry;
        private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

		[Authorize(Roles ="GIFWAdmin")]
        public async Task SendBroadcast(string messageType, string messageSeverity, string message, string version)
        {
            var userId = _httpContextAccessor.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            _telemetry.TrackEvent($"{messageSeverity} message was sent to version {version} as a {messageType} by user ID {userId}");
            await Clients.All.SendAsync("ReceiveBroadcast", messageType, messageSeverity, message, version);
        }
    }
}
