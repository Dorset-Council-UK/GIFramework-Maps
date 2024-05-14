import * as GIFWMaps from "./Map";
import * as GIFWSidebar from "./Sidebar";
import { Tooltip } from "bootstrap";
import { BroadcastReceiver } from "./BroadcastReceiver";
import { BasemapsPanel } from "./Panels/BasemapsPanel";
import { LayersPanel } from "./Panels/LayersPanel";
import { PrintPanel } from "./Panels/PrintPanel";
import {
  ApplicationInsights,
  ITelemetryItem,
} from "@microsoft/applicationinsights-web";
import { LegendsPanel } from "./Panels/LegendsPanel";
import { SharePanel } from "./Panels/SharePanel";
import { Welcome } from "./Welcome";
import { VersionViewModel } from "./Interfaces/VersionViewModel";
import { Tour } from "./Tour";
import { Alert, AlertSeverity, AlertType, Helper } from "./Util";
import {
  Browser as BrowserHelper,
} from "./Util";
import { SidebarPanel } from "./Interfaces/SidebarPanel";

/*variables passed from index.cshtml. Use sparingly*/
declare let gifw_appinsights_key: string;
declare let gifw_version_config_url: string;
declare let gifw_map_services_access_token: string;
declare let gifw_map_services_access_url: string;

if (gifw_appinsights_key != "") {
  const appInsights = new ApplicationInsights({
    config: {
      connectionString: gifw_appinsights_key,
      disableCookiesUsage: true,
    },
  });
  //the following telemetry filter removes the broadcasthub pings
  const filteringFunction = (envelope: ITelemetryItem) => {
    if ((envelope.baseData["name"] as string).indexOf("broadcasthub") !== -1) {
      return false;
    }
    return true;
  };
  appInsights.addTelemetryInitializer(filteringFunction);
  appInsights.loadAppInsights();
}

document.addEventListener("DOMContentLoaded", () => {
  //This allows the use of a cookie control
  if (
    configure_cookie_control == "Civic Cookie Control" &&
    typeof CookieControl != "undefined"
  ) {
    document
      .getElementById("CookieControlLink")
      .addEventListener("click", CookieControl.open);
  }

  const mapId = "giframeworkMap";

  Helper.addFullScreenLoader(mapId, "Loading your map");

  fetch(gifw_version_config_url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json() as Promise<VersionViewModel>;
    })
    .then(async (config) => {
      if (gifw_map_services_access_token && gifw_map_services_access_url) {
        await fetch(`${gifw_map_services_access_url}`, {
          method: "GET",
          cache: "no-store",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${gifw_map_services_access_token}`,
          },
        });
      }

      try {
        BroadcastReceiver.init(config.slug, config.appRoot);
        let mode: 'full' | 'embed' = 'full';
        if (window.location.hash !== "") {
          if (BrowserHelper.extractParamFromHash(window.location.hash, 'embed') !== null) {
            mode = 'embed';
          }
        }

        const sidebars = Array<GIFWSidebar.Sidebar>();
        const panels = Array<SidebarPanel>();

        const basemapsPanel = new BasemapsPanel("#basemaps");
        panels.push(basemapsPanel);
        const basemapsSidebar = new GIFWSidebar.Sidebar(
          "basemaps",
          "Background Map",
          "Choose a map to have as your background",
          `${document.location.protocol}//${config.appRoot}img/panel-icons/basemaps-icon.svg`,
          1,
          basemapsPanel,
        );
        sidebars.push(basemapsSidebar);

        const layersPanel = new LayersPanel("#layers-control");
        panels.push(layersPanel);

        const layersSidebar = new GIFWSidebar.Sidebar(
          "layers-control",
          "Layers",
          "Add some layers to your map",
          `${document.location.protocol}//${config.appRoot}img/panel-icons/layers-icon.svg`,
          2,
          layersPanel,
        );
        sidebars.push(layersSidebar);

        const legendPanel = new LegendsPanel("#legends");
        panels.push(legendPanel);

        const legendSidebar = new GIFWSidebar.Sidebar(
          "legends",
          "Legends",
          "View a legend for the map",
          `${document.location.protocol}//${config.appRoot}img/panel-icons/legend-icon.svg`,
          3,
          legendPanel,
        );
        sidebars.push(legendSidebar);

        if (mode !== 'embed') {
          const sharePanel = new SharePanel("#share");
          panels.push(sharePanel);

          const shareSidebar = new GIFWSidebar.Sidebar(
            "share",
            "Share",
            "Share a link to the map",
            `${document.location.protocol}//${config.appRoot}img/panel-icons/share-icon.svg`,
            4,
            sharePanel,
            );
          sidebars.push(shareSidebar);

          const printPanel = new PrintPanel("#print-control");
          panels.push(printPanel);

          const printSidebar = new GIFWSidebar.Sidebar(
            "print-control",
            "Export/Print",
            "Export and Print your map",
            `${document.location.protocol}//${config.appRoot}img/panel-icons/print-icon.svg`,
            5,
            printPanel,
          );
          sidebars.push(printSidebar);
        }

        const map = new GIFWMaps.GIFWMap(mapId, config, sidebars, mode);

        map.initMap();

        panels.forEach(panel => {
          panel.setGIFWMapInstance(map);
        });
        
        const tooltipTriggerList = [].slice.call(
          document.querySelectorAll('[data-bs-toggle="tooltip"]'),
        );
        tooltipTriggerList.map((tooltipTriggerEl: HTMLElement) => {
          return new Tooltip(tooltipTriggerEl);
        });

        let welcomeShown = false;
        if (config.welcomeMessage) {
          const welcome = new Welcome(config.welcomeMessage, config.id);
          welcomeShown = welcome.showWelcomeMessageIfAppropriate();
        }

        if (config.tourDetails) {
          const tour = new Tour(config.id, config.tourDetails);
          if (welcomeShown) {
            //hide the tour until the welcome is dismissed
            const modal = document.querySelector("#welcome-modal");
            modal.addEventListener("hidden.bs.modal", () => {
              tour.showTourIfAppropriate();
            });
          } else {
            tour.showTourIfAppropriate();
          }
        }
      } catch (ex) {
          console.error('There was an error creating the map');
          throw ex; // Throw the error to preserve the stack trace
      } finally {
        Helper.removeFullScreenLoader(mapId);
      }
    })
    .catch((error) => {
      console.error("Failed to load the app", error);
      //show an alert that covers the screen
      const alert = new Alert(
        AlertType.Popup,
        AlertSeverity.Danger,
        "There was a problem",
        `<p>There was a problem loading the map. The developers have been automatically notified of the problem.</p>
            <p>Please try refreshing the page or come back later.</p>`,
        "#gifw-complete-failure-modal",
      );
      alert.show();
      (document.querySelector(".modal-backdrop") as HTMLElement).style.opacity =
        "1";
      (
        document.querySelector(".modal-backdrop") as HTMLElement
      ).style.backgroundColor = "var(--primary-color)";
    });
});
