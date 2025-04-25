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
       //ajax call to get this from the server, refresh is also handled by the server side
       fetch(this.authURL)
           .then((response) => {
               if (!response.ok) {
                   throw new Error("Network response was not ok");
               }
               return response.json() as Promise<string>;
           })
           .then((data) => {
               this.accessToken = data;
           })
           .catch((error) => {
               console.error("Failed to use SSO", error);
           });

    return this.accessToken;
  }

  public async refreshAccessToken(): Promise<void> {
    //TODO - refresh the access token 
    //Not implemented
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
