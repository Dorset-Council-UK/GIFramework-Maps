using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace GIFrameworkMaps.Web.Hubs
{
	public class BroadcastHub(ILogger<BroadcastHub> logger, IHttpContextAccessor httpContextAccessor) : Hub
	{
		private readonly ILogger<BroadcastHub> _logger = logger;
		private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

		[Authorize(Roles ="GIFWAdmin")]
		public async Task SendBroadcast(string messageType, string messageSeverity, string message, string version)
		{
			var userId = _httpContextAccessor.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
			_logger.LogInformation("{MessageSeverity} message was sent to version {Version} as a {MessageType} by user ID {UserId}",
				messageSeverity, version, messageType, userId);
			await Clients.All.SendAsync("ReceiveBroadcast", messageType, messageSeverity, message, version);
		}
	}
}
