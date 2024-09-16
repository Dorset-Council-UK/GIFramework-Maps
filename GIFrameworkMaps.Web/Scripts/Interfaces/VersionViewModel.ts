import { Basemap } from "./Basemap";
import { Bound } from "./Bound";
import { Category } from "./Category";
import { Theme } from "./Theme";
import { TourDetails } from "./Tour/TourDetails";
import { WelcomeMessage } from "./WelcomeMessage";
import { Projection } from "./Projection";
import { Attribution } from "./Attribution";

export interface VersionViewModel {
  id: number;
  name: string;
  description: string;
  slug: string;
  categories: Category[];
  basemaps: Basemap[];
  helpURL: string;
  feedbackURL: string;
  showLogin: boolean;
  theme: Theme;
  bound: Bound;
  welcomeMessage: WelcomeMessage;
  tourDetails: TourDetails;
  attribution: Attribution;
  availableProjections: Projection[];
  appRoot: string;
  appInsightsKey: string;
  googleMapsAPIKey: string;
  isLoggedIn: boolean;
}
