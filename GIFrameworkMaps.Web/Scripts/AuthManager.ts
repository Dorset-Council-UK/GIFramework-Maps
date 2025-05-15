import { AuthType } from "./Interfaces/Authorization/AuthType";
import { UrlAuthorizationRules } from "./Interfaces/Authorization/UrlAuthorizationRules";

export class AuthManager {
  private accessToken: string | null = null;
  private authRules: UrlAuthorizationRules[] = [];
  private authURL: string;

  constructor(accessToken: string | null, authRules: UrlAuthorizationRules[], authURL: string) {
    this.accessToken = accessToken;
    this.authRules = authRules;
    this.authURL = authURL;
  }

   public getAccessToken(): string | null {
    return this.accessToken;
  }

  public async refreshAccessToken(): Promise<void> {
    try {
      const resp = await fetch(this.authURL);
      if (!resp.ok) {
        throw new Error("Network response was not ok");
      }
      this.accessToken = await resp.text();
    } catch (e) {
      console.error("Failed to fetch access token",e);
    }
  }

  public getAuthenticationType(url: string): AuthType {
    for (const rule of this.authRules.sort((a,b) => a.priority - b.priority)) {
      if (new RegExp(rule.url).test(url)) {
        return rule.authorizationType;
      }
    }
    return AuthType.None;
  }

  public applyAuthenticationToRequestHeaders(url: string, headers: Headers): void {
    if (this.accessToken === null) {
      return;
    }
    const authType = this.getAuthenticationType(url);
    if (authType === AuthType.Bearer) {
      const accessToken = this.getAccessToken();
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
    }
  }
}
