import { AuthType } from "./Interfaces/Authorization/AuthType";
import { UrlAuthorizationRules } from "./Interfaces/Authorization/UrlAuthorizationRules";

export class AuthManager {
  private accessToken: string | null = null;
  private authRules: UrlAuthorizationRules[] = [];

  constructor(accessToken: string, authRules: UrlAuthorizationRules[]) {
    this.accessToken = accessToken;
    this.authRules = authRules;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public async refreshAccessToken(): Promise<void> {
    //TODO - refresh the access token
  }

  public getAuthenticationType(url: string): AuthType {
    for (const rule of this.authRules.sort((a,b) => a.priority - b.priority)) {
      if (new RegExp(rule.url).test(url)) {
        return rule.authorizationType;
      }
    }
    return AuthType.None;
  }
}
