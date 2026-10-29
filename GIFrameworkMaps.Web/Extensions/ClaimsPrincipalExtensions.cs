using Microsoft.Identity.Web;

namespace System.Security.Claims;

internal static class ClaimsPrincipalExtensions
{
	private const string Unknown = "Unknown";

	private static string? GetClaimValue(ClaimsPrincipal? claimsPrincipal, params string[] claimNames)
	{
		if (claimsPrincipal is null)
		{
			return null;
		}

		for (var i = 0; i < claimNames.Length; i++)
		{
			var currentValue = claimsPrincipal.FindFirstValue(claimNames[i]);
			if (!string.IsNullOrWhiteSpace(currentValue))
			{
				return currentValue;
			}
		}

		return null;
	}

	extension(ClaimsPrincipal? claimsPrincipal)
	{
		/// <summary>
		/// Get the display name from the claims
		/// </summary>
		/// <remarks>
		///     <para>GetDisplayName() from Microsoft.Identity.Web finds claims in the order preferred_username, http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name, name.</para>
		///     <para>We need name to be more important.</para>
		/// </remarks>
		internal string DisplayName => GetClaimValue(claimsPrincipal, ["name", ClaimTypes.Name, "preferred_username"]) ?? Unknown;

		/// <summary>
		/// Get the email address from the claims
		/// </summary>
		/// <remarks>Checking the claims in the order http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress, emails, preferred_username</remarks>
		internal string Email => GetClaimValue(claimsPrincipal, [ClaimTypes.Email, "emails", "preferred_username"]) ?? Unknown;

		/// <summary>
		/// Get the identity provider from the claims
		/// </summary>
		/// <remarks>Checking the claims in the order http://schemas.microsoft.com/identity/claims/identityprovider, http://schemas.microsoft.com/accesscontrolservice/2010/07/claims/identityprovider, identityprovider, idp</remarks>
		internal string IdentityProvider =>
			GetClaimValue(claimsPrincipal, [
				"http://schemas.microsoft.com/identity/claims/identityprovider",
				"http://schemas.microsoft.com/accesscontrolservice/2010/07/claims/identityprovider",
				"identityprovider",
				"idp",
			]) ?? Unknown;

		internal bool IsAuthenticated => claimsPrincipal?.Identity?.IsAuthenticated ?? false;

		/// <summary>
		/// Get the objectID claim which is http://schemas.xmlsoap.org/ws/2005/05/identity/claims/objectid
		/// </summary>
		internal string UserId => claimsPrincipal?.GetObjectId() ?? Unknown;
	}
}
