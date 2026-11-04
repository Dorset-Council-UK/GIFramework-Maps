using GIFrameworkMaps.Web.Controllers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Moq;
using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Tests
{
	public class AccountControllerTests
	{
		private const string GeoServerScope = "api://adc584d3-ece9-4f40-81cc-5e10cc7bf446/access_as_user";
		private const string TokenEndpoint = "https://identity.example.test/custom/oauth2/v2.0/token";
		private Mock<IAuthenticationService> authenticationService;
		private AccountController controller;
		private AuthenticationTicket ticket;
		private AuthenticationProperties savedProperties;
		private RefreshHandler refreshHandler;
		private HttpClient httpClient;
		private ServiceProvider serviceProvider;

		[SetUp]
		public void SetUp()
		{
			savedProperties = null;
			authenticationService = new Mock<IAuthenticationService>();
			serviceProvider = new ServiceCollection()
				.AddSingleton(authenticationService.Object)
				.BuildServiceProvider();
			var httpContext = new DefaultHttpContext { RequestServices = serviceProvider };
			refreshHandler = new RefreshHandler();
			httpClient = new HttpClient(refreshHandler);
			var httpClientFactory = new Mock<IHttpClientFactory>();
			httpClientFactory.Setup(factory => factory.CreateClient(It.IsAny<string>())).Returns(httpClient);
			var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string>
			{
				["AzureAd:ClientId"] = "f2ad6d44-9929-49f4-9055-a24bb3edfe56",
				["AzureAd:ClientSecret"] = "test-only-secret",
				["AzureAd:Authority"] = "https://identity.example.test/tenant/v2.0"
			}).Build();
			var options = new OpenIdConnectOptions
			{
				Configuration = new OpenIdConnectConfiguration { TokenEndpoint = TokenEndpoint }
			};
			options.Scope.Add("email");
			options.Scope.Add("offline_access");
			options.Scope.Add(GeoServerScope);
			var optionsMonitor = new Mock<IOptionsMonitor<OpenIdConnectOptions>>();
			optionsMonitor.Setup(monitor => monitor.Get(OpenIdConnectDefaults.AuthenticationScheme)).Returns(options);
			controller = new AccountController(null, null, configuration, httpClientFactory.Object,
				NullLogger<AccountController>.Instance, optionsMonitor.Object)
			{
				ControllerContext = new ControllerContext { HttpContext = httpContext }
			};
			authenticationService.Setup(service => service.SignInAsync(It.IsAny<HttpContext>(),
				CookieAuthenticationDefaults.AuthenticationScheme, It.IsAny<ClaimsPrincipal>(), It.IsAny<AuthenticationProperties>()))
				.Callback<HttpContext, string, ClaimsPrincipal, AuthenticationProperties>((_, _, _, properties) => savedProperties = properties)
				.Returns(Task.CompletedTask);
			SetTicket("opaque-access-token", DateTimeOffset.UtcNow.AddHours(1).ToString("o", CultureInfo.InvariantCulture));
		}

		[TearDown]
		public void TearDown()
		{
			httpClient.Dispose();
			serviceProvider.Dispose();
		}

		[Test]
		public async Task Token_ReturnsAccessTokenInsteadOfIdToken()
		{
			var result = await controller.Token();

			Assert.That(result, Is.TypeOf<ContentResult>());
			Assert.That(((ContentResult)result).Content, Is.EqualTo("opaque-access-token"));
			Assert.That(((ContentResult)result).ContentType, Is.EqualTo("text/plain"));
			Assert.That(refreshHandler.RequestCount, Is.Zero);
		}

		[Test]
		public async Task Token_AnonymousUser_ReturnsNoContent()
		{
			controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());

			Assert.That(await controller.Token(), Is.TypeOf<NoContentResult>());
			authenticationService.Verify(service => service.AuthenticateAsync(It.IsAny<HttpContext>(), It.IsAny<string>()), Times.Never);
			Assert.That(refreshHandler.RequestCount, Is.Zero);
		}

		[Test]
		public async Task Token_FailedCookieAuthentication_ReturnsNoContent()
		{
			authenticationService.Setup(service => service.AuthenticateAsync(It.IsAny<HttpContext>(),
				CookieAuthenticationDefaults.AuthenticationScheme)).ReturnsAsync(AuthenticateResult.NoResult());

			Assert.That(await controller.Token(), Is.TypeOf<NoContentResult>());
			Assert.That(refreshHandler.RequestCount, Is.Zero);
		}

		[Test]
		public async Task Token_IdTokenOnly_DoesNotReturnIdToken()
		{
			SetTicket(null, null, null);

			Assert.That(await controller.Token(), Is.TypeOf<NoContentResult>());
			Assert.That(refreshHandler.RequestCount, Is.Zero);
		}

		[TestCase(null)]
		[TestCase("invalid-expiry")]
		public async Task Token_UnknownExpiryWithoutRefreshToken_ReturnsNoContent(string expiry)
		{
			SetTicket("opaque-access-token", expiry, null);

			Assert.That(await controller.Token(), Is.TypeOf<NoContentResult>());
		}

		[TestCase(null)]
		[TestCase("invalid-expiry")]
		public async Task Token_UnknownExpiry_RefreshesAccessToken(string expiry)
		{
			SetTicket("opaque-access-token", expiry);
			refreshHandler.ResponseBody = RefreshResponse();

			var result = await controller.Token();

			Assert.That(result, Is.TypeOf<ContentResult>());
			Assert.That(((ContentResult)result).Content, Is.EqualTo("refreshed-access-token"));
			Assert.That(refreshHandler.RequestCount, Is.EqualTo(1));
		}

		[Test]
		public async Task Token_MissingAccessToken_RefreshesWithoutReturningIdToken()
		{
			SetTicket(null, DateTimeOffset.UtcNow.AddHours(1).ToString("o", CultureInfo.InvariantCulture));
			refreshHandler.ResponseBody = RefreshResponse();

			var result = await controller.Token();

			Assert.That(result, Is.TypeOf<ContentResult>());
			Assert.That(((ContentResult)result).Content, Is.EqualTo("refreshed-access-token"));
			Assert.That(savedProperties.GetTokenValue("access_token"), Is.EqualTo("refreshed-access-token"));
		}

		[TestCase(false)]
		[TestCase(true)]
		public async Task Token_Refresh_UsesConfiguredScopesAndEndpointAndPersistsAccessTokenLifetime(bool rotateTokens)
		{
			SetTicket("old-access-token", DateTimeOffset.UtcNow.AddMinutes(-1).ToString("o", CultureInfo.InvariantCulture));
			refreshHandler.ResponseBody = RefreshResponse(idToken: rotateTokens ? "new-id-token" : null,
				refreshToken: rotateTokens ? "rotated-refresh-token" : null);
			var before = DateTimeOffset.UtcNow;

			var result = await controller.Token();

			var after = DateTimeOffset.UtcNow;
			Assert.That(result, Is.TypeOf<ContentResult>());
			Assert.That(((ContentResult)result).Content, Is.EqualTo("refreshed-access-token"));
			Assert.That(refreshHandler.RequestUri, Is.EqualTo(new Uri(TokenEndpoint)));
			var form = QueryHelpers.ParseQuery(refreshHandler.RequestBody);
			Assert.That(form["scope"].ToString().Split(' '), Is.EquivalentTo(new[] { "openid", "profile", "email", "offline_access", GeoServerScope }));
			Assert.That(form["grant_type"].ToString(), Is.EqualTo("refresh_token"));
			Assert.That(form["refresh_token"].ToString(), Is.EqualTo("original-refresh-token"));
			Assert.That(form["client_id"].ToString(), Is.EqualTo("f2ad6d44-9929-49f4-9055-a24bb3edfe56"));
			Assert.That(savedProperties.GetTokenValue("access_token"), Is.EqualTo("refreshed-access-token"));
			Assert.That(savedProperties.GetTokenValue("id_token"), Is.EqualTo(rotateTokens ? "new-id-token" : "original-id-token"));
			Assert.That(savedProperties.GetTokenValue("refresh_token"), Is.EqualTo(rotateTokens ? "rotated-refresh-token" : "original-refresh-token"));
			var expiry = DateTimeOffset.Parse(savedProperties.GetTokenValue("expires_at"), CultureInfo.InvariantCulture);
			Assert.That(expiry, Is.InRange(before.AddSeconds(3600), after.AddSeconds(3600)));
			Assert.That(ticket.Properties.GetTokenValue("access_token"), Is.EqualTo("old-access-token"));
		}

		[TestCase(-1)]
		[TestCase(3)]
		public async Task Token_ExpiredOrExpiringAccessToken_AttemptsRefresh(int minutesUntilExpiry)
		{
			SetTicket("old-access-token", DateTimeOffset.UtcNow.AddMinutes(minutesUntilExpiry).ToString("o", CultureInfo.InvariantCulture));
			refreshHandler.ResponseBody = RefreshResponse();

			var result = await controller.Token();

			Assert.That(result, Is.TypeOf<ContentResult>());
			Assert.That(((ContentResult)result).Content, Is.EqualTo("refreshed-access-token"));
			Assert.That(refreshHandler.RequestCount, Is.EqualTo(1));
		}

		[Test]
		public async Task Token_ExpiredAccessTokenWithoutRefreshToken_ReturnsNoContent()
		{
			SetTicket("expired-access-token", DateTimeOffset.UtcNow.AddMinutes(-1).ToString("o", CultureInfo.InvariantCulture), null);

			Assert.That(await controller.Token(), Is.TypeOf<NoContentResult>());
			Assert.That(refreshHandler.RequestCount, Is.Zero);
		}

		[TestCase(-1, false)]
		[TestCase(3, true)]
		public async Task Token_RefreshFailure_ReturnsOldTokenOnlyWhileStillValid(int minutesUntilExpiry, bool returnsToken)
		{
			SetTicket("old-access-token", DateTimeOffset.UtcNow.AddMinutes(minutesUntilExpiry).ToString("o", CultureInfo.InvariantCulture));
			refreshHandler.StatusCode = HttpStatusCode.BadRequest;
			refreshHandler.ResponseBody = "{\"error\":\"invalid_grant\"}";

			var result = await controller.Token();

			Assert.That(refreshHandler.RequestCount, Is.EqualTo(1));
			Assert.That(savedProperties, Is.Null);
			if (returnsToken)
			{
				Assert.That(result, Is.TypeOf<ContentResult>());
				Assert.That(((ContentResult)result).Content, Is.EqualTo("old-access-token"));
			}
			else
			{
				Assert.That(result, Is.TypeOf<NoContentResult>());
			}
		}

		[TestCase(null, 3600)]
		[TestCase("new-access-token", 0)]
		[TestCase("new-access-token", -1)]
		public async Task Token_InvalidRefreshResponse_DoesNotPersistOrReturnExpiredToken(string accessToken, int expiresIn)
		{
			SetTicket("expired-access-token", DateTimeOffset.UtcNow.AddMinutes(-1).ToString("o", CultureInfo.InvariantCulture));
			refreshHandler.ResponseBody = RefreshResponse(accessToken, expiresIn);

			Assert.That(await controller.Token(), Is.TypeOf<NoContentResult>());
			Assert.That(savedProperties, Is.Null);
		}

		[Test]
		public void Token_DisablesResponseCaching()
		{
			var attribute = typeof(AccountController).GetMethod(nameof(AccountController.Token))
				.GetCustomAttributes(typeof(ResponseCacheAttribute), false).Cast<ResponseCacheAttribute>().Single();

			Assert.That(attribute.NoStore, Is.True);
			Assert.That(attribute.Location, Is.EqualTo(ResponseCacheLocation.None));
		}

		private void SetTicket(string accessToken, string expiresAt, string refreshToken = "original-refresh-token")
		{
			var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "test-user") }, "test"));
			var properties = new AuthenticationProperties();
			var tokens = new List<AuthenticationToken> { new() { Name = "id_token", Value = "original-id-token" } };
			if (accessToken != null) tokens.Add(new AuthenticationToken { Name = "access_token", Value = accessToken });
			if (expiresAt != null) tokens.Add(new AuthenticationToken { Name = "expires_at", Value = expiresAt });
			if (refreshToken != null) tokens.Add(new AuthenticationToken { Name = "refresh_token", Value = refreshToken });
			properties.StoreTokens(tokens);
			ticket = new AuthenticationTicket(principal, properties, CookieAuthenticationDefaults.AuthenticationScheme);
			controller.HttpContext.User = principal;
			authenticationService.Setup(service => service.AuthenticateAsync(It.IsAny<HttpContext>(),
				CookieAuthenticationDefaults.AuthenticationScheme)).ReturnsAsync(AuthenticateResult.Success(ticket));
		}

		private static string RefreshResponse(string accessToken = "refreshed-access-token", int expiresIn = 3600,
			string idToken = null, string refreshToken = null)
		{
			return JsonSerializer.Serialize(new { access_token = accessToken, expires_in = expiresIn, id_token = idToken, refresh_token = refreshToken });
		}

		private sealed class RefreshHandler : HttpMessageHandler
		{
			public HttpStatusCode StatusCode { get; set; } = HttpStatusCode.OK;
			public string ResponseBody { get; set; } = "{}";
			public int RequestCount { get; private set; }
			public Uri RequestUri { get; private set; }
			public string RequestBody { get; private set; }

			protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
			{
				RequestCount++;
				RequestUri = request.RequestUri;
				RequestBody = await request.Content.ReadAsStringAsync(cancellationToken);
				return new HttpResponseMessage(StatusCode) { Content = new StringContent(ResponseBody) };
			}
		}
	}
}
