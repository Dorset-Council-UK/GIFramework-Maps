export class AuthManager {
  private accessToken: string | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public async refreshAccessToken(): Promise<void> {
    //TODO - refresh the access token
  }

  public addAuthToLayer(url: string): boolean {
    //TODO - Check configurable regex of url -> auth_type
    if (url.indexOf('gi.dorsetcouncil.gov.uk') !== -1 || url.indexOf('gi-staging.dorsetcouncil.gov.uk') !== -1){
      return true;
    }
    return false;
  }
}
