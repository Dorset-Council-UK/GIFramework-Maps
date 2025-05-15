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

namespace GIFrameworkMaps.Web.Controllers;

[Authorize]
public class AccountController(ICommonRepository repository,
							   ApplicationDbContext context,
							   IConfiguration configuration,
							   IHttpClientFactory httpClientFactory,
							   ILogger<AccountController> logger) : Controller
{

	public IActionResult Index()
	{
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
	public async Task<IActionResult> Token()
	{
		try
		{
			if (User.Identity.IsAuthenticated)
			{
				var idToken = await HttpContext.GetTokenAsync("id_token");
				var refreshToken = await HttpContext.GetTokenAsync("refresh_token");
				var expiresAt = await HttpContext.GetTokenAsync("expires_at");

				if (!string.IsNullOrEmpty(expiresAt) && !string.IsNullOrEmpty(refreshToken))
				{
					if (DateTimeOffset.TryParse(expiresAt, out var expiryDate) && expiryDate.AddMinutes(-5) < DateTimeOffset.UtcNow)
					{
						var refreshedTokens = await RefreshTokensAsync(refreshToken);
						if (refreshedTokens != null)
						{
							await UpdateAuthenticationTicketAsync(refreshedTokens);
							idToken = refreshedTokens.id_token;
						}
					}
				}
				if (!string.IsNullOrEmpty(idToken))
				{
					return Content(idToken, "text/plain");
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
			var baseURL = configuration.GetSection("AzureAd")["Authority"];
			if (string.IsNullOrEmpty(baseURL)) return null;

			var queryString = new Dictionary<string, string>
			{
				{ "grant_type", "refresh_token" },
				{ "refresh_token", refreshToken },
				{ "client_id", configuration.GetSection("AzureAd")["ClientId"] },
				{ "client_secret", configuration.GetSection("AzureAd")["ClientSecret"] }
			};

			var requestUri = QueryHelpers.AddQueryString(baseURL + "oauth2/v2.0/token", queryString);
			using var client = httpClientFactory.CreateClient();
			var response = await client.PostAsync(requestUri, null);

			if (response.IsSuccessStatusCode)
			{
				var content = await response.Content.ReadAsStreamAsync();
				var serializer = new DataContractJsonSerializer(typeof(RefreshResponseModel));
				return (RefreshResponseModel)serializer.ReadObject(content);
			}
		}
		catch(Exception ex)
		{
			logger.LogError(ex, "Error occurred while processing the token refresh.");
		}

		return null;
	}

	private async Task UpdateAuthenticationTicketAsync(RefreshResponseModel tokens)
	{
		var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
		var ticket = authResult.Ticket;

		if (ticket != null)
		{
			var updatedTicket = ticket.Clone();
			//use the tickets issued time if possible, fall back to DateTimeOffset.UtcNow if not
			if (!updatedTicket.Properties.Items.TryGetValue(AuthenticationTicketProperties.Issued, out var issuedString) ||
				!DateTimeOffset.TryParse(issuedString, out var issuedTime))
			{
				issuedTime = DateTimeOffset.UtcNow;
			}
			if (!string.IsNullOrEmpty(tokens.id_token))
			{
				updatedTicket.Properties.Items[AuthenticationTicketProperties.IdToken] = tokens.id_token;
			}
			if (!string.IsNullOrEmpty(tokens.access_token))
			{
				updatedTicket.Properties.Items[AuthenticationTicketProperties.AccessToken] = tokens.access_token;
			}
			if (!string.IsNullOrEmpty(tokens.refresh_token))
			{
				updatedTicket.Properties.Items[AuthenticationTicketProperties.RefreshToken] = tokens.refresh_token;
			}
			updatedTicket.Properties.Items[AuthenticationTicketProperties.ExpiresAt] = issuedTime.AddSeconds(tokens.id_token_expires_in).ToString("o");
			updatedTicket.Properties.Items[AuthenticationTicketProperties.Issued] = issuedTime.ToString("o");
			updatedTicket.Properties.Items[AuthenticationTicketProperties.Expires] = issuedTime.AddSeconds(tokens.expires_in).ToString("o");

			// Sign in again with the updated ticket
			// This will automatically handle storing the ticket in the ticket store
			await HttpContext.SignInAsync(
				CookieAuthenticationDefaults.AuthenticationScheme,
				updatedTicket.Principal,
				updatedTicket.Properties);
		}
	}
}
