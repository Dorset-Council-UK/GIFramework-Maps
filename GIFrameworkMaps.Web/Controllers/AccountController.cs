using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Web;
using System.Net.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using GIFrameworkMaps.Web.Models;
using System.Runtime.Serialization.Json;
using System.Collections.Generic;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Options;
using System.Globalization;
using System.Linq;

namespace GIFrameworkMaps.Web.Controllers;

[Authorize]
public class AccountController(ICommonRepository repository,
							   ApplicationDbContext context,
							   IConfiguration configuration,
							   IHttpClientFactory httpClientFactory,
							   ILogger<AccountController> logger,
							   IOptionsMonitor<OpenIdConnectOptions> openIdConnectOptions) : Controller
{

	public IActionResult Index()
	{
		return View();
	}

	[AllowAnonymous]
	public IActionResult CaptureHashAndSignIn(string returnUrl)
	{
		if (string.IsNullOrEmpty(returnUrl) || !Url.IsLocalUrl(returnUrl))
		{
			returnUrl = "/";
		}

		ViewData["ReturnUrl"] = returnUrl;
		ViewData["ReturnUrlJavaScriptEncoded"] = System.Text.Encodings.Web.JavaScriptEncoder.Default.Encode(returnUrl);
		return View();
	}

	[AllowAnonymous]
	public async Task<IActionResult> SignInWithRedirect(string redirectUri)
	{
		StringWriter decodedStringWriter = new();
		string decodedString;
		// Decode the encoded string.
		HttpUtility.HtmlDecode(redirectUri, decodedStringWriter);
		decodedString = decodedStringWriter.ToString();
		//generate short link for redirectUri
		if (Uri.IsWellFormedUriString(decodedString, UriKind.Absolute) && repository.IsURLCurrentApplication(decodedString))
		{
			string shortId = await repository.GenerateShortId(decodedString);
			if (shortId == null)
			{
				return RedirectToAction("SignIn", "Account", new { area = "MicrosoftIdentity", redirectUri = decodedString });
			}

			await context.ShortLinks.AddAsync(new ShortLink
			{
				ShortId = shortId,
				FullUrl = decodedString
			});
			await context.SaveChangesAsync();

			Uri shortLink = new(Url.RouteUrl("UserShortLink", new { id = shortId }, Request.Scheme));

			string relativeShortLink = shortLink.IsAbsoluteUri ? shortLink.PathAndQuery : shortLink.OriginalString;

			return RedirectToAction("SignIn", "Account", new { area = "MicrosoftIdentity", redirectUri = relativeShortLink });
		}
		else
		{
			return RedirectToAction("SignIn", "Account", new { area = "MicrosoftIdentity" });

		}
	}

	[AllowAnonymous]
	[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
	public async Task<IActionResult> Token()
	{
		try
		{
			if (User.IsAuthenticated)
			{
				var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
				if (!authResult.Succeeded || authResult.Ticket == null)
				{
					return NoContent();
				}
				var properties = authResult.Ticket.Properties;
				var accessToken = properties.GetTokenValue("access_token");
				var refreshToken = properties.GetTokenValue("refresh_token");
				var hasExpiry = DateTimeOffset.TryParse(properties.GetTokenValue("expires_at"),
					CultureInfo.InvariantCulture, DateTimeStyles.None, out var expiryDate);

				if (string.IsNullOrEmpty(accessToken) || !hasExpiry || expiryDate <= DateTimeOffset.UtcNow.AddMinutes(5))
				{
					if (!string.IsNullOrEmpty(refreshToken))
					{
						var refreshedTokens = await RefreshTokensAsync(refreshToken);
						if (refreshedTokens != null)
						{
							await UpdateAuthenticationTicketAsync(authResult.Ticket, refreshedTokens);
							return Content(refreshedTokens.access_token, "text/plain");
						}
					}
				}
				if (!string.IsNullOrEmpty(accessToken) && hasExpiry && expiryDate > DateTimeOffset.UtcNow)
				{
					return Content(accessToken, "text/plain");
				}
			}
		}
		catch (Exception ex)
		{
			logger.LogError(ex, "Error occurred while processing the token endpoint.");
		}
		return NoContent();
	}

	private async Task<RefreshResponseModel> RefreshTokensAsync(string refreshToken)
	{
		try
		{
			var azureAdSection = configuration.GetSection("AzureAd");
			var options = openIdConnectOptions.Get(OpenIdConnectDefaults.AuthenticationScheme);
			var oidcConfiguration = options.Configuration;
			if (oidcConfiguration == null && options.ConfigurationManager != null)
			{
				oidcConfiguration = await options.ConfigurationManager.GetConfigurationAsync(HttpContext.RequestAborted);
			}
			if (string.IsNullOrEmpty(oidcConfiguration?.TokenEndpoint))
			{
				logger.LogWarning("Token refresh failed because the OpenID Connect token endpoint is unavailable.");
				return null;
			}

			var formData = new Dictionary<string, string>
			{
				{ "grant_type", "refresh_token" },
				{ "refresh_token", refreshToken },
				{ "client_id", azureAdSection["ClientId"] },
				{ "client_secret", azureAdSection["ClientSecret"] },
				{ "scope", string.Join(" ", options.Scope) }
			};

			using var client = httpClientFactory.CreateClient("OpenIdConnectResilient");
			using var requestContent = new FormUrlEncodedContent(formData);
			using var response = await client.PostAsync(oidcConfiguration.TokenEndpoint, requestContent, HttpContext.RequestAborted);

			if (response.IsSuccessStatusCode)
			{
				using var content = await response.Content.ReadAsStreamAsync(HttpContext.RequestAborted);
				var serializer = new DataContractJsonSerializer(typeof(RefreshResponseModel));
				var tokens = (RefreshResponseModel)serializer.ReadObject(content);
				if (string.IsNullOrEmpty(tokens?.access_token) || tokens.expires_in <= 0)
				{
					logger.LogWarning("Token refresh succeeded but no access_token with a valid lifetime was returned.");
					return null;
				}
				return tokens;
			}
			logger.LogWarning("Token refresh failed with status code {StatusCode}.", response.StatusCode);
		}
		catch(Exception ex)
		{
			logger.LogError(ex, "Error occurred while processing the token refresh.");
		}

		return null;
	}

	private async Task UpdateAuthenticationTicketAsync(AuthenticationTicket ticket, RefreshResponseModel tokens)
	{
		var updatedTicket = ticket.Clone();
		var storedTokens = updatedTicket.Properties.GetTokens().ToDictionary(token => token.Name, token => token.Value);
		if (!string.IsNullOrEmpty(tokens.id_token))
		{
			storedTokens["id_token"] = tokens.id_token;
		}
		storedTokens["access_token"] = tokens.access_token;
		storedTokens["expires_at"] = DateTimeOffset.UtcNow.AddSeconds(tokens.expires_in).ToString("o", CultureInfo.InvariantCulture);
		if (!string.IsNullOrEmpty(tokens.refresh_token))
		{
			storedTokens["refresh_token"] = tokens.refresh_token;
		}
		updatedTicket.Properties.StoreTokens(storedTokens.Select(token => new AuthenticationToken { Name = token.Key, Value = token.Value }));

		// Sign in again with the updated ticket
		// This will automatically handle storing the ticket in the ticket store
		await HttpContext.SignInAsync(
			CookieAuthenticationDefaults.AuthenticationScheme,
			updatedTicket.Principal,
			updatedTicket.Properties);
	}
}
