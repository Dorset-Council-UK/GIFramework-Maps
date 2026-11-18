using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Yarp.ReverseProxy.Forwarder;

namespace GIFrameworkMaps.Tests
{
	public class ProxyEndpointTests
	{
		[TestCase("", StatusCodes.Status400BadRequest)]
		[TestCase("?url=", StatusCodes.Status400BadRequest)]
		[TestCase("?url=relative", StatusCodes.Status400BadRequest)]
		[TestCase("?url=https://maps.example.test&url=https://maps.example.test", StatusCodes.Status400BadRequest)]
		[TestCase("?url=https://other.example.test", StatusCodes.Status403Forbidden)]
		[TestCase("?url=https://sub.maps.example.test", StatusCodes.Status403Forbidden)]
		[TestCase("?url=http://maps.example.test:443", StatusCodes.Status403Forbidden)]
		[TestCase("?url=https://maps.example.test:8443", StatusCodes.Status403Forbidden)]
		[TestCase("?url=https://maps.example.test:0", StatusCodes.Status403Forbidden)]
		[TestCase("?url=https://localhost", StatusCodes.Status403Forbidden)]
		[TestCase("?url=https://127.0.0.1", StatusCodes.Status403Forbidden)]
		public async Task RejectedDestinationsNeverReachForwarder(string query, int expectedStatus)
		{
			using var services = CreateServices();
			using var client = new HttpMessageInvoker(new HttpClientHandler());
			var context = new DefaultHttpContext { RequestServices = services };
			context.Request.QueryString = new QueryString(query);
			var forwarder = new Mock<IHttpForwarder>(MockBehavior.Strict);

			await Startup.ForwardProxyRequestAsync(context, forwarder.Object, client, new ForwarderRequestConfig());

			Assert.That(context.Response.StatusCode, Is.EqualTo(expectedStatus));
			forwarder.VerifyNoOtherCalls();
		}

		[TestCase("https://maps.example.test")]
		[TestCase("https://MAPS.example.test:443")]
		public async Task AllowlistedHttpsOnPort443ForwardsTheValidatedPathAndQuery(string origin)
		{
			using var services = CreateServices();
			using var client = new HttpMessageInvoker(new HttpClientHandler());
			const string pathAndQuery = "/tiles/a%2Fb?layers=one%26two&format=image%2Fpng";
			var context = new DefaultHttpContext { RequestServices = services };
			context.Request.Path = "/proxy";
			context.Request.QueryString = QueryString.Create("url", origin + pathAndQuery);
			context.Request.Host = new HostString("app.example.test");
			context.Request.Headers.Origin = "https://app.example.test";
			context.Request.Headers.Cookie = "session=test";
			var forwarder = new Mock<IHttpForwarder>(MockBehavior.Strict);
			var options = new ForwarderRequestConfig();
			forwarder.Setup(f => f.SendAsync(context, "https://maps.example.test", client, options, It.IsAny<HttpTransformer>()))
				.Returns(async (HttpContext incoming, string prefix, HttpMessageInvoker _, ForwarderRequestConfig _, HttpTransformer transformer) =>
				{
					using var outgoing = new HttpRequestMessage();
					await transformer.TransformRequestAsync(incoming, outgoing, prefix, CancellationToken.None);
					Assert.That(outgoing.RequestUri.PathAndQuery, Is.EqualTo(pathAndQuery));
					Assert.That(outgoing.RequestUri.GetLeftPart(UriPartial.Authority), Is.EqualTo(prefix));
					Assert.That(outgoing.Headers.Host, Is.Null);
					Assert.That(outgoing.Headers.Contains("Origin"), Is.False);
					Assert.That(outgoing.Headers.Contains("Cookie"), Is.False);
					return ForwarderError.None;
				});

			await Startup.ForwardProxyRequestAsync(context, forwarder.Object, client, options);

			forwarder.Verify(f => f.SendAsync(context, "https://maps.example.test", client, options, It.IsAny<HttpTransformer>()), Times.Once);
		}

		[TestCase("0.0.0.0")]
		[TestCase("10.0.0.1")]
		[TestCase("100.127.255.255")]
		[TestCase("127.0.0.2")]
		[TestCase("169.254.0.1")]
		[TestCase("172.31.255.255")]
		[TestCase("192.168.0.1")]
		[TestCase("::")]
		[TestCase("::1")]
		[TestCase("::ffff:127.0.0.1")]
		[TestCase("::ffff:192.168.0.1")]
		[TestCase("fc00::1")]
		[TestCase("fd00::1")]
		[TestCase("fe80::1")]
		[TestCase("fec0::1")]
		public void RejectsDnsResultContainingAnInternalAddress(string address)
		{
			Assert.Throws<HttpRequestException>(() => Startup.ValidateProxyAddresses(
				[IPAddress.Parse("8.8.8.8"), IPAddress.Parse(address)]));
		}

		[Test]
		public void RejectsEmptyDnsResult()
		{
			Assert.Throws<HttpRequestException>(() => Startup.ValidateProxyAddresses([]));
		}

		[Test]
		public void AcceptsPublicIpv4AndIpv6DnsResults()
		{
			Assert.DoesNotThrow(() => Startup.ValidateProxyAddresses(
				[IPAddress.Parse("100.128.0.1"), IPAddress.Parse("172.32.0.1"), IPAddress.Parse("2606:4700::1111")]));
		}

		private static ServiceProvider CreateServices()
		{
			var repo = new Mock<ICommonRepository>();
			repo.Setup(r => r.GetProxyAllowedHostsAsync()).ReturnsAsync(new List<ProxyAllowedHost>
			{
				new() { Host = "Maps.Example.Test" },
				new() { Host = "localhost" },
				new() { Host = "127.0.0.1" }
			});
			return new ServiceCollection().AddLogging().AddSingleton(repo.Object).BuildServiceProvider();
		}
	}
}
