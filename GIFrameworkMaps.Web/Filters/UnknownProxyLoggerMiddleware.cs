// Custom middleware class to log unknown proxies
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Filters;

public class UnknownProxyLoggingMiddleware(RequestDelegate next, ILogger<UnknownProxyLoggingMiddleware> logger, IOptionsMonitor<ForwardedHeadersOptions> optionsMonitor)
{
	private readonly ForwardedHeadersOptions _options = optionsMonitor.CurrentValue;

	public async Task InvokeAsync(HttpContext context)
	{
		// Check if the request comes from a proxy
		var remoteIpAddress = context.Connection.RemoteIpAddress;

		if (remoteIpAddress != null && context.Request.Headers.ContainsKey("X-Forwarded-For"))
		{
			// Check if the proxy is known
			bool isKnownProxy = _options.KnownProxies.Contains(remoteIpAddress);

			if (!isKnownProxy)
			{
				logger.LogWarning("Unknown proxy detected: {ProxyIP} forwarding request from {ForwardedFor} to {RequestPath}",
					remoteIpAddress,
					context.Request.Headers["X-Forwarded-For"].ToString().Replace(Environment.NewLine, ""),
					context.Request.Path.Value.Replace(Environment.NewLine, ""));
			}
		}

		await next(context);
	}
}