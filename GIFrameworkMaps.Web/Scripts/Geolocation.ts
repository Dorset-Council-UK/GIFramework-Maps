import { Modal } from "bootstrap";
import { Control as olControl } from "ol/control";
import { Coordinate } from "ol/coordinate";
import { containsCoordinate } from "ol/extent";
import Feature from "ol/Feature";
import { GPX } from "ol/format";
import Geolocation, { GeolocationError } from "ol/Geolocation";
import { Geometry, LineString, Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
/*SIM MODE, UNCOMMENT TO TEST*/
/*import { transform } from "ol/proj";*/
import VectorSource from "ol/source/Vector";
import { getLength } from "ol/sphere";
import { Fill, RegularShape, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { AnimationOptions } from "ol/View";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import { GIFWMap } from "./Map";
import { GIFWPopupAction } from "./Popups/PopupAction";
import { GIFWPopupOptions } from "./Popups/PopupOptions";
import Spinner from "./Spinner";
import { UserSettings } from "./UserSettings";
import { Alert, AlertSeverity, Browser as BrowserHelper, Color } from "./Util";

export class GIFWGeolocation extends olControl {
  gifwMapInstance: GIFWMap;
  olGeolocation: Geolocation;
  optionsModal: Modal;
  exportModal: Modal;
  firstLocation: boolean = true;
  /*minAccuracyThreshold should be one of 10,20 or 50 to match with select options. 
    Could use the type def `10 | 20 | 50` but this makes retrieving the value from the select box a bit harder*/
  minAccuracyThreshold: number = 20;
  accuracyWarningInterval: number;
  drawPath: boolean = true;
  wakeLockAvailable: boolean = false;
  useWakeLock: boolean = false;
  wakeLock: WakeLockSentinel = null;
  mapLockedOnGeolocation: boolean = false;
  _trackControlElement: HTMLElement;
  _recentreControlElement: HTMLElement;
  _locationVectorSource: VectorSource;
  _pathVectorSource: VectorSource;
  _locationLayer: VectorLayer<VectorSource>;
  _pathLayer: VectorLayer<VectorSource>;
  _locationFeature: Feature<Point>;
  _pathFeature: Feature<LineString>;
  /*Simulation mode can be used to test the geolocation functionality without having to go outside.*/
  /*Set the below variable to true to enable simulation mode.*/
  /*When simulation mode is enabled, the geolocation will be simulated using the coordinates in the simulatedCoordinates array.*/
  /*Uncomment this and any other areas where 'SIM MODE, UNCOMMENT TO TEST' can be found */
  //_simulationMode: boolean = true;
  //_simModeIndex: number = 0;
  //_simModeIntervalTimer: number;
  constructor(gifwMapInstance: GIFWMap) {
    const geolocationControlElement = document.createElement("div");

    super({
      element: geolocationControlElement,
    });

    this.gifwMapInstance = gifwMapInstance;

    /*We only want the values 10,20 and 50 to be acceptable. Default to 20*/
    this.minAccuracyThreshold =
      parseInt(
        UserSettings.getItem("geolocationMinAccuracyThreshold", undefined, [
          "10",
          "20",
          "50",
        ]),
      ) || 20;

    this.drawPath =
      UserSettings.getItem("geolocationDrawPath", undefined, [
        "true",
        "false",
      ]) === null
        ? true
        : UserSettings.getItem("geolocationDrawPath") === "true";
    this.useWakeLock =
      UserSettings.getItem("geolocationUseWakeLock", undefined, [
        "true",
        "false",
      ]) === null
        ? true
        : UserSettings.getItem("geolocationUseWakeLock") === "true";

    if ("wakeLock" in navigator) {
      this.wakeLockAvailable = true;
    }
    this.renderGeolocationControls();
    this.addUIEvents();
    //bind the unlock and visibility handlers to 'this'' so we can remove and add it properly. Bit of a hack!
    this.unlockMapIfNotAnimating = this.unlockMapIfNotAnimating.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the geolocation functionality.
   */
  public init() {
    this.optionsModal = Modal.getOrCreateInstance("#geolocation-options-modal");
    this.exportModal = Modal.getOrCreateInstance("#geolocation-export-modal");

    this._locationVectorSource = new VectorSource();
    this._pathVectorSource = new VectorSource();
    this._locationLayer = this.gifwMapInstance.addNativeLayerToMap(
      this._locationVectorSource,
      "Geolocation",
      (feature: Feature<Geometry>) => {
        return this.getStyleForGeolocationFeature(feature);
      },
      false,
      LayerGroupType.SystemNative,
      501,
      false,
      "__geolocation__",
    );
    this._pathLayer = this.gifwMapInstance.addNativeLayerToMap(
      this._pathVectorSource,
      "Geolocation - Path",
      undefined,
      false,
      LayerGroupType.SystemNative,
      500,
      true,
      "__geolocation_path__",
    );

    this.olGeolocation = new Geolocation({
      // enableHighAccuracy must be set to true to have the heading value.
      trackingOptions: {
        enableHighAccuracy: true,
        timeout: 120_000, //2 minutes
      },
      projection: this.gifwMapInstance.olMap.getView().getProjection(),
    });

    // handle geolocation error.
    this.olGeolocation.on("error", this.handleGeolocationError.bind(this));
    this.olGeolocation.on("change:accuracyGeometry", () => {
      this.renderPositionIndicatorOnMap();
    });
    this.olGeolocation.on("change:position", () => {
      this.renderPositionIndicatorOnMap();
    });
    /*SIM MODE, UNCOMMENT TO TEST*/
    //if (this._simulationMode) {

    //    this.olGeolocation.getAccuracy = () => { return this.simulatedAccuracy[Math.floor(Math.random() * (this.simulatedAccuracy.length - 0 + 1) + 0)];}
    //    this.olGeolocation.getHeading = () => { return this.simulatedHeading[Math.floor(Math.random() * (this.simulatedHeading.length - 0 + 1) + 0)];}
    //this.olGeolocation.getPosition = () => { return transform(this.simulatedCoordinates[this._simModeIndex], 'EPSG:4326', this.olGeolocation.getProjection()); }

    //}
  }

  /**
   * Renders the geolocation controls on the UI
   */

  private renderGeolocationControls() {
    const trackButton = document.createElement("button");
    trackButton.innerHTML = '<i class="bi bi-cursor"></i>';
    trackButton.setAttribute("title", "Track my location");
    const recentreButton = document.createElement("button");
    recentreButton.innerHTML = "Recentre";
    recentreButton.setAttribute("title", "Recentre map on my location");
    const trackElement = document.createElement("div");
    trackElement.className = "gifw-geolocation-control ol-control";
    trackElement.appendChild(trackButton);
    const recentreElement = document.createElement("div");
    recentreElement.className =
      "gifw-geolocation-control gifw-geolocation-recentre-control ol-control";
    recentreElement.appendChild(recentreButton);
    recentreElement.style.display = "none";
    this._trackControlElement = trackElement;
    this._recentreControlElement = recentreElement;
    this.element.appendChild(trackElement);
    this.element.appendChild(recentreElement);

    //set up the options modal
    (
      document.querySelector(
        "#geolocation-options-modal #geolocationScreenLock",
      ) as HTMLInputElement
    ).checked = this.useWakeLock;
    if (!this.wakeLockAvailable) {
      document
        .querySelector("#geolocation-options-modal #geolocationScreenLock")
        .setAttribute("disabled", "");
      document.querySelector(
        "#geolocation-options-modal #geolocationScreenLockHelpText",
      ).textContent = `This feature is not available in your browser`;
      document
        .querySelector(
          "#geolocation-options-modal #geolocationScreenLockHelpText",
        )
        .classList.add("text-danger");
    }
    (
      document.querySelector(
        "#geolocation-options-modal #geolocationDrawTrack",
      ) as HTMLInputElement
    ).checked = this.drawPath;
    const accuracySelectList = document.querySelector(
      "#geolocation-options-modal #geolocationAccuracyThreshold",
    ) as HTMLSelectElement;
    accuracySelectList.value = this.minAccuracyThreshold.toString();
  }

  /**
   * Adds the event listeners for the geolocation controls
   */
  private addUIEvents() {
    this._trackControlElement.addEventListener("click", () => {
      if (this._trackControlElement.classList.contains("ol-control-active")) {
        this.deactivateGeolocation();
      } else {
        this.optionsModal.show();
      }
    });

    this._recentreControlElement.addEventListener("click", () => {
      this.recentreMapOnLocation();
    });

    document
      .querySelector("#geolocation-options-modal .btn-primary")
      .addEventListener("click", () => {
        this.drawPath = (
          document.querySelector(
            "#geolocation-options-modal #geolocationDrawTrack",
          ) as HTMLInputElement
        ).checked;
        this.useWakeLock = (
          document.querySelector(
            "#geolocation-options-modal #geolocationScreenLock",
          ) as HTMLInputElement
        ).checked;
        this.minAccuracyThreshold = parseInt(
          (
            document.querySelector(
              "#geolocation-options-modal #geolocationAccuracyThreshold",
            ) as HTMLSelectElement
          ).selectedOptions[0].value,
        );
        UserSettings.setItem(
          "geolocationMinAccuracyThreshold",
          this.minAccuracyThreshold.toString(),
        );
        UserSettings.setItem("geolocationDrawPath", this.drawPath.toString());
        UserSettings.setItem(
          "geolocationUseWakeLock",
          this.useWakeLock.toString(),
        );

        this.activateGeolocation();
      });

    document
      .querySelector("#geolocation-export-modal .btn-primary")
      .addEventListener("click", (e) => {
        (e.currentTarget as HTMLButtonElement).disabled = true;
        //download feature
        this.downloadGPX();
        (e.currentTarget as HTMLButtonElement).disabled = false;
        this.exportModal.hide();
      });
  }

  /**
   * Renders the users location on the map if the accuracy is good enough.
   * @returns void
   */
  private renderPositionIndicatorOnMap() {
    const position = this.olGeolocation.getPosition();
    const heading = this.olGeolocation.getHeading();
    const accuracy = this.olGeolocation.getAccuracy();
    if (accuracy > this.minAccuracyThreshold) {
      if (!this.accuracyWarningInterval) {
        this.accuracyWarningInterval = window.setInterval(() => {
          Alert.showTimedToast(
            "Waiting for better accuracy",
            "Your location accuracy is too low. Waiting for a better signal.",
            AlertSeverity.Warning,
          );
        }, 10000);
      }
      return;
    } else {
      window.clearInterval(this.accuracyWarningInterval);
      this.accuracyWarningInterval = null;
    }

    this.drawLocationMarker(position, heading);

    if (this.drawPath) {
      if (!this._pathFeature) {
        this.createPathFeature();
      }
      this.updatePathFeature(position, this.firstLocation);
    }

    if (this.firstLocation) {
      this._trackControlElement.querySelector("button .spinner")?.remove();
      this._trackControlElement
        .querySelector("i.bi")
        .classList.remove("d-none");
      this.firstLocation = false;
    }
  }

  /**
   * Deactivates the geolocation functionality
   */
  private deactivateGeolocation() {
    this._trackControlElement.classList.remove("ol-control-active");
    this._trackControlElement.querySelector("button .spinner")?.remove();
    this._trackControlElement.querySelector("i.bi").className = "bi bi-cursor";
    this.gifwMapInstance.resetInteractionsToDefault();
    this._trackControlElement.querySelector("button").blur();
    this.olGeolocation.setTracking(false);
    this._locationLayer.setVisible(false);
    this._locationVectorSource.clear();
    this._locationFeature = null;

    if (this.drawPath) {
      if (this._pathFeature?.getGeometry().getCoordinates().length > 2) {
        //show modal with download GPX link
        let length = Math.round(getLength(this._pathFeature.getGeometry()));
        let lengthStr = length.toString();
        let unit = "m";
        if (length >= 1000) {
          length = length / 1000;
          lengthStr = length.toFixed(2);
          unit = "km";
        }
        document.querySelector(
          "#geolocation-export-modal #geolocation-export-track-length",
        ).textContent = `${lengthStr}${unit}`;
        this.exportModal.show();
      }
    }

    window.clearInterval(this.accuracyWarningInterval);
    this.accuracyWarningInterval = null;
    this.releaseWakeLock();

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.unlockMap();
    this.gifwMapInstance.olMap.un("movestart", this.unlockMapIfNotAnimating);
    this._recentreControlElement.style.display = "none";
    /*SIM MODE, UNCOMMENT TO TEST*/
    //if (this._simulationMode) {
    //    window.clearInterval(this._simModeIntervalTimer);
    //}
  }

  /**
   * Activates the geolocation functionality
   */
  private activateGeolocation() {
    this.firstLocation = true;
    //switch layer on if it isn't on already
    if (!this._locationLayer.getVisible()) {
      this._locationLayer.setVisible(true);
    }
    if (this.drawPath) {
      if (!this._pathLayer.getVisible()) {
        this._pathLayer.setVisible(true);
      }
    }
    this._trackControlElement.classList.add("ol-control-active");
    this._trackControlElement.querySelector("i.bi").className =
      "bi bi-cursor-fill d-none";
    this._trackControlElement
      .querySelector("button")
      .append(Spinner.create(["spinner-border-sm", "text-white"]));
    document
      .getElementById(this.gifwMapInstance.id)
      .dispatchEvent(new Event("gifw-geolocation-start"));
    this.olGeolocation.setTracking(true);

    if (this.useWakeLock) {
      this.requestWakeLock();
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
    /*SIM MODE, UNCOMMENT TO TEST*/
    //if (this._simulationMode) {
    //    this._simModeIntervalTimer = window.setInterval(() => {
    //        this._simModeIndex += 1;
    //        if (this._simModeIndex == this.simulatedCoordinates.length) {
    //            this._simModeIndex = 0;
    //        }
    //        this.olGeolocation.dispatchEvent('change:position')
    //    }, 1500);
    //}
  }

  private drawLocationMarker(position: Coordinate, heading: number) {
    if (!this._locationFeature) {
      this._locationFeature = new Feature();
      this._locationVectorSource.addFeature(this._locationFeature);
    }

    this._locationFeature.set("gifw-heading", heading);
    this._locationFeature.setGeometry(new Point(position));
    if (this.firstLocation || this.mapLockedOnGeolocation) {
      const _firstLocation = this.firstLocation;
      const opts: AnimationOptions = {
        center: position,
        duration: 500,
      };
      if (this.firstLocation) {
        if (this.gifwMapInstance.olMap.getView().getZoom() < 18) {
          opts.zoom = 18;
        }
      }
      this.gifwMapInstance.olMap.getView().animate(opts, (success) => {
        if (success) {
          if (_firstLocation) {
            this.gifwMapInstance.olMap.on(
              "movestart",
              this.unlockMapIfNotAnimating,
            );
            this.lockMap();
          }
        }
      });
    }
  }

  private createPathFeature() {
    this._pathFeature = new Feature();
    this._pathVectorSource.addFeature(this._pathFeature);
    const popupDownloadAction = new GIFWPopupAction(
      "Download this path as a GPX file",
      this.downloadGPX.bind(this),
      false,
      true,
    );
    const popupClearPathAction = new GIFWPopupAction(
      "Remove path from map",
      () => {
        this._pathVectorSource.clear();
        this._pathFeature = null;
        this._pathLayer.setVisible(false);
      },
      true,
      true,
    );
    const timestamp = new Date().toLocaleTimeString();
    const popupOpts = new GIFWPopupOptions(
      `<h1>Your path</h1><p><strong>Started:</strong> ${timestamp}</p>`,
      [popupDownloadAction, popupClearPathAction],
    );
    this._pathFeature.set("gifw-popup-opts", popupOpts);
    this._pathFeature.set("gifw-popup-title", `Your path`);
  }

  private updatePathFeature(position: Coordinate, isFirstLocation: boolean) {
    if (isFirstLocation) {
      this._pathFeature.setGeometry(new LineString([position, position]));
    } else {
      this._pathFeature.getGeometry().appendCoordinate(position);
    }
  }

  private recentreMapOnLocation() {
    const position = this.olGeolocation.getPosition();
    const curExtent = this.gifwMapInstance.olMap.getView().calculateExtent();
    if (
      !BrowserHelper.PrefersReducedMotion() &&
      containsCoordinate(curExtent, position)
    ) {
      const opts: AnimationOptions = {
        center: position,
        duration: 500,
      };
      if (this.gifwMapInstance.olMap.getView().getZoom() < 18) {
        opts.zoom = 18;
      }
      this.gifwMapInstance.olMap.getView().animate(opts);
    } else {
      this.gifwMapInstance.olMap.getView().setCenter(position);
      if (this.gifwMapInstance.olMap.getView().getZoom() < 18) {
        this.gifwMapInstance.olMap.getView().setZoom(18);
      }
    }
    //small timeout prevents the case where setCenter and setZoom trigger the unlock of the map
    window.setTimeout(() => {
      this.lockMap();
    }, 500);
  }

  /**
   * Downloads the current path as a GPX file
   */
  private downloadGPX() {
    const formatter = new GPX();
    const gpx = formatter.writeFeatures(this._pathVectorSource.getFeatures(), {
      featureProjection: this.gifwMapInstance.olMap.getView().getProjection(),
    });
    const blob = new Blob([gpx], {
      type: "application/gpx+xml",
    });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    const timestamp = new Date().toISOString();
    downloadLink.download = `GPXTrack_${timestamp}.gpx`;
    downloadLink.click();
  }

  /**
   * Requests access to the screen wake lock API if available
   */
  private async requestWakeLock() {
    if (this.wakeLockAvailable) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
      } catch (err) {
        // The Wake Lock request has failed - usually system related, such as battery.
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }

  /**
   * Releases any active screen wake lock
   */
  private releaseWakeLock() {
    if (this.wakeLock && !this.wakeLock?.released) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  /**
   * Locks the map to the current geolocation, meaning the map automatically follows the user's location
   */
  private lockMap() {
    this._recentreControlElement.style.display = "none";
    this.mapLockedOnGeolocation = true;
  }

  /**
   * Unlocks the map from the current geolocation if the view is not currently animating
   */
  private unlockMapIfNotAnimating() {
    if (!this.gifwMapInstance.olMap.getView().getAnimating()) {
      this.unlockMap();
    }
  }

  /**
   * Unlocks the map from the current geolocation, meaning the user can pan around freely
   */
  private unlockMap() {
    this._recentreControlElement.style.display = "";
    this.mapLockedOnGeolocation = false;
  }

  /**
   * Re-requests the screen wake lock if the user has switched back to the tab
   */
  private handleVisibilityChange() {
    if (this.wakeLock !== null && document.visibilityState === "visible") {
      this.requestWakeLock();
    }
  }

  /**
   * Handles a location error
   * @param error the OpenLayers GeolocationError object
   */
  private handleGeolocationError(error: GeolocationError) {
    console.error(error);
    this.deactivateGeolocation();
    let msg = "An error occurred while trying to get your location.";
    switch (error.code) {
      case 1:
        msg =
          "You have denied access to your location. Please enable location services in your browser settings and refresh the page.";
        break;
      case 3:
        msg =
          "It took too long to get your location. Make sure you are in an area with a clear view of the sky for best results.";
        break;
    }
    Alert.showPopupError("Geolocation error", msg);
  }

  /**
   * Returns the style for the marker used to show the users location
   * @param feature - The OpenLayers feature to style
   * @returns Style[] Array of OpenLayers Style objects
   */
  private getStyleForGeolocationFeature(feature: Feature<Geometry>) {
    const rgbColor = Color.hexToRgb(
      this.gifwMapInstance.config.theme.primaryColour,
    );

    const fill = new Fill({
      color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 1)`,
    });
    const stroke = new Stroke({
      color: "rgba(255, 255, 255, 1)",
      width: 2,
    });
    const circle = new Style({
      image: new CircleStyle({
        radius: 7,
        stroke: stroke,
        fill: fill,
      }),
    });

    const arrow = new Style({
      image: new RegularShape({
        fill: fill,
        stroke: stroke,
        points: 3,
        radius: feature.get("gifw-heading") === undefined ? 0 : 7, //make the pointer disappear if no heading defined
        displacement: [0, 12],
        rotation: feature.get("gifw-heading"),
      }),
    });

    return [circle, arrow];
  }

  /**
   * Simulated coordinates for testing. These are the coordinates for a walk around Borough Gardens, Dorchester, Dorset, UK
   */
  /*SIM MODE, UNCOMMENT TO TEST*/
  //private simulatedCoordinates: number[][] = [[
  //    -2.441370637422439,
  //    50.71416976895679
  //],
  //[
  //    -2.441376001840468,
  //    50.71411542183668
  //],
  //[
  //    -2.4413652730044086,
  //    50.71406786805488
  //],
  //[
  //    -2.4413652730044086,
  //    50.71401691752084
  //],
  //[
  //    -2.441418132147921,
  //    50.71397508004904
  //],
  //[
  //    -2.4414189171847065,
  //    50.71391841299797
  //],
  //[
  //    -2.441451103692885,
  //    50.71380632139255
  //],
  //[
  //    -2.4414993834551537,
  //    50.713731593506736
  //],
  //[
  //    -2.441601307397719,
  //    50.71365007204085
  //],
  //[
  //    -2.4417890620287617,
  //    50.71361270798823
  //],
  //[
  //    -2.441892969926586,
  //    50.713596443757694
  //],
  //[
  //    -2.4420197320040424,
  //    50.7135923275834
  //],
  //[
  //    -2.4419499945696552,
  //    50.71354817000909
  //],
  //[
  //    -2.4420411896761616,
  //    50.713507409134365
  //],
  //[
  //    -2.4420626473482807,
  //    50.71344626775584
  //],
  //[
  //    -2.4420572829302514,
  //    50.71338512629751
  //],
  //[
  //    -2.4420143675860126,
  //    50.71330700098474
  //],
  //[
  //    -2.4419017148073876,
  //    50.713228875541716
  //],
  //[
  //    -2.4417515111025536,
  //    50.713126972594324
  //],
  //[
  //    -2.4416978669222558,
  //    50.71307262426512
  //],
  //[
  //    -2.4416495871599873,
  //    50.712889198188805
  //],
  //[
  //    -2.441558392053481,
  //    50.712838246373536
  //],
  //[
  //    -2.4414618325289448,
  //    50.712760120149284
  //],
  //[
  //    -2.4413974595125874,
  //    50.71273294577989
  //],
  //[
  //    -2.441268713479873,
  //    50.712729548982594
  //],
  //[
  //    -2.441172153955337,
  //    50.712770310533756
  //],
  //[
  //    -2.4411292386110985,
  //    50.712838246373536
  //],
  //[
  //    -2.4411131453570087,
  //    50.712892594974534
  //],
  //[
  //    -2.4410863232668603,
  //    50.71296732419793
  //],
  //[
  //    -2.44108095884883,
  //    50.713038656527345
  //],
  //[
  //    -2.4411238741930683,
  //    50.71308960812476
  //],
  //[
  //    -2.4412257981356347,
  //    50.71315754350181
  //],
  //[
  //    -2.4413491797503193,
  //    50.7131949079172
  //],
  //[
  //    -2.4413545441683495,
  //    50.713303604229054
  //],
  //[
  //    -2.441392095094558,
  //    50.713422490531514
  //],
  //[
  //    -2.4413169932421406,
  //    50.713537979793756
  //],
  //[
  //    -2.4412284536801754,
  //    50.7136139327813
  //],
  //[
  //    -2.4412043404635155,
  //    50.71369762624653
  //],
  //[
  //    -2.441247255807754,
  //    50.71383349513971
  //],
  //[
  //    -2.4413169932421406,
  //    50.71395238009822
  //],
  //[
  //    -2.441376001840468,
  //    50.71411542183668
  //],
  //[
  //    -2.4413384509142597,
  //    50.71422411601392
  //    ]];
  ///**
  // * Simulated heading for testing. These are random headings and don't tie with the coordinates above, so don't expect the pointer to point in the right direction
  // */
  //private simulatedHeading: number[] = [0.08726646, 0.2617994, undefined, 3.316126, 3.141593, 5.061455];
  ///**
  // * Simulated accuracy values for testing.
  // */
  //private simulatedAccuracy: number[] = [4, 3, 12, 8, 7, 5];
}
