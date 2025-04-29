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
using Microsoft.Graph.Beta.Models;
using System.Net.Http;
using GIFrameworkMaps.Data.Models.Search;
using Microsoft.Graph.Beta.Models.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using GIFrameworkMaps.Web.Models;
using System.Net.Http.Json;
using System.Runtime.Serialization.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using System.Collections.Generic;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.Net.Sockets;

namespace GIFrameworkMaps.Web.Controllers
{

	[Authorize]
	public class AccountController(ICommonRepository repository, ApplicationDbContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory, ITicketStore ticketStore) : Controller
	{
		private readonly ICommonRepository _repository = repository;
		private readonly ApplicationDbContext _context = context;
		private readonly IConfiguration _configuration = configuration;
		private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
		private readonly ITicketStore _ticketStore = ticketStore;

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
			if (Uri.IsWellFormedUriString(decodedString, UriKind.Absolute) && _repository.IsURLCurrentApplication(decodedString))
			{
				string shortId = await _repository.GenerateShortId(decodedString);
				if (shortId == null)
				{
					return RedirectToAction("SignIn", "Account", new { area = "MicrosoftIdentity", redirectUri = decodedString });
				}

				await _context.ShortLinks.AddAsync(new ShortLink
				{
					ShortId = shortId,
					FullUrl = decodedString
				});
				await _context.SaveChangesAsync();

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
		public async Task<JsonResult> TokenEndpoint()
		{
			var idToken = await HttpContext.GetTokenAsync("id_token");
			if (User.Identity.IsAuthenticated)
			{
				var refreshToken = await HttpContext.GetTokenAsync("refresh_token");
				var expiresAt = await HttpContext.GetTokenAsync("expires_at");
				
				if (!string.IsNullOrEmpty(expiresAt) && !string.IsNullOrEmpty(refreshToken))
				{
					//We have a refresh token and can refresh the ID token if required. Else we just return what we have
					var expiryDate = DateTime.Parse(expiresAt);

					//TODO handle timezone issue, currently set to handle summertime
					if (expiryDate.AddMinutes(-5) < DateTime.UtcNow.AddHours(1))
					{
						// Token will expire in 5 minutes, refresh it
						string baseURL = string.IsNullOrEmpty(_configuration.GetSection("AzureAd")["Authority"]) ? "" : _configuration.GetSection("AzureAd")["Authority"];
						if (!string.IsNullOrEmpty(baseURL))
						{
							var queryString = new Dictionary<string, string>()
							{
								{ "grant_type", "refresh_token"},
								{ "refresh_token", refreshToken },
								{ "client_id", _configuration.GetSection("AzureAd")["ClientId"]},
								{ "client_secret", _configuration.GetSection("AzureAd")["ClientSecret"] }
							};

							var requestUri = QueryHelpers.AddQueryString(baseURL + "oauth2/v2.0/token", queryString);

							var request = new HttpRequestMessage(HttpMethod.Post, requestUri);

							using var client = _httpClientFactory.CreateClient();
							var response = await client.SendAsync(request);

							// Get the current time as close as possible to response time
							DateTime responseTime = DateTime.UtcNow.AddHours(1);

							if (response.IsSuccessStatusCode)
							{
								// Store new tokens
								var content = await response.Content.ReadAsStreamAsync();
								var js = new DataContractJsonSerializer(typeof(RefreshResponseModel));
								var results = (RefreshResponseModel)js.ReadObject(content);

								var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
								var ticket = authResult.Ticket;
								if (ticket != null)
								{
									var oldTokenKey = ticket.Properties.Items[".AuthScheme"];

									if (results != null)
									{
										AuthenticationTicket updatedTicket = ticket.Clone();

										if (!string.IsNullOrEmpty(results.id_token))
										{
											updatedTicket.Properties.Items[".Token.id_token"] = results.id_token;
										}
										if (!string.IsNullOrEmpty(results.access_token))
										{
											updatedTicket.Properties.Items[".Token.access_token"] = results.access_token;
										}
										if (!string.IsNullOrEmpty(results.refresh_token))
										{
											updatedTicket.Properties.Items[".Token.refresh_token"] = results.refresh_token;
										}
										updatedTicket.Properties.Items[".Token.expires_at"] = responseTime.AddSeconds(results.id_token_expires_in).ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz");
										updatedTicket.Properties.Items[".issued"] = responseTime.ToString("ddd, dd MMM yyyy HH:mm:ss 'GMT'");
										updatedTicket.Properties.Items[".expires"] = responseTime.AddSeconds(results.expires_in).ToString("ddd, dd MMM yyyy HH:mm:ss 'GMT'");
										await _ticketStore.RenewAsync(oldTokenKey, updatedTicket);
									}
								}
							}
						}
					}
				}
			} 

			string userToken = string.IsNullOrEmpty(idToken) ? "": idToken.ToString();
			return Json(userToken);
		}
	}
}
