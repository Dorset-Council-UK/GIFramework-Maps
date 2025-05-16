import { AuthType } from "./AuthType";

export interface UrlAuthorizationRules {
  url: string;
  priority: number;
  authorizationType: AuthType;
}