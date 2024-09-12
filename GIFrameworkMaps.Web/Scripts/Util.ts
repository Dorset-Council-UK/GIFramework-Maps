import { Modal, Toast } from "bootstrap";
import { Circle, Fill, Stroke, Style as olStyle } from "ol/style";
import { Theme } from "./Interfaces/Theme";
import { GIFWMap } from "./Map";
import { toLonLat } from "ol/proj";
import { Layer as olLayer } from "ol/layer";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Point, SimpleGeometry } from "ol/geom";
import { GIFWPopupOptions } from "./Popups/PopupOptions";
import { ImageWMS, Source, TileWMS } from "ol/source";
import { Layer, LayerSource, LayerSourceOption } from "./Interfaces/Layer";
import LayerRenderer from "ol/renderer/Layer";
import GML32 from "ol/format/GML32";
import GML3 from "ol/format/GML3";
import GML2 from "ol/format/GML2";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";

export class Projection {
  /**
   * Converts a British National Grid Easting/Northing to the Alphanumeric grid
   * @param x The Easting value
   * @param y The Northing value
   * @param includeSpaces Whether to include spaces seperating the alpha and numeric parts in the output
   * @returns A formatted British National Grid Alphanumeric coordinate, or the text 'Outside UK'
   * @author Ordnance Survey - https://github.com/OrdnanceSurvey/os-transform
   */
  static convertBNGEastingNorthingToAlpha(
    x: number,
    y: number,
    includeSpaces?: boolean,
  ): string {
    if (x < 0 || x >= 700000 || y < 0 || y >= 1300000) {
      return "Outside UK";
    }
    const xBase = Math.floor(x / 100000);
    const yBase = Math.floor(y / 100000);

    const prefix = this.prefixes[yBase][xBase];
    if (!prefix) {
      return "Outside UK";
    }
    const e = Math.floor(x % 100000)
      .toString()
      .padStart(5, "0");
    const n = Math.floor(y % 100000)
      .toString()
      .padStart(5, "0");

    const sp = includeSpaces ? " " : "";

    return `${prefix}${sp}${e}${sp}${n}`;
  }
  private static prefixes = [
    ["SV", "SW", "SX", "SY", "SZ", "TV", "TW"],
    ["SQ", "SR", "SS", "ST", "SU", "TQ", "TR"],
    ["SL", "SM", "SN", "SO", "SP", "TL", "TM"],
    ["SF", "SG", "SH", "SJ", "SK", "TF", "TG"],
    ["SA", "SB", "SC", "SD", "SE", "TA", "TB"],
    ["NV", "NW", "NX", "NY", "NZ", "OV", "OW"],
    ["NQ", "NR", "NS", "NT", "NU", "OQ", "OR"],
    ["NL", "NM", "NN", "NO", "NP", "OL", "OM"],
    ["NF", "NG", "NH", "NJ", "NK", "OF", "OG"],
    ["NA", "NB", "NC", "ND", "NE", "OA", "OB"],
    ["HV", "HW", "HX", "HY", "HZ", "JV", "JW"],
    ["HQ", "HR", "HS", "HT", "HU", "JQ", "JR"],
    ["HL", "HM", "HN", "HO", "HP", "JL", "JM"],
  ];
}
export class Browser {
  /**
   * Checks whether the current user agent is providing the hint that it prefers reduced motion
   * @returns True for it does prefer reduced motion, false otherwise
   */
  static PrefersReducedMotion(): boolean {
    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (!reduceMotionQuery) {
      //the media query is unavailable
      return false;
    } else {
      return reduceMotionQuery.matches;
    }
  }

  /**
   * Extracts individual, de-duplicated parameters from a URL #hash
   * @param hash The hash as a string
   * @returns The paramaters extracted from the hash as a Record
   */
  static extractParamsFromHash(hash: string): Record<string, string> {
    if (hash.startsWith("#")) {
      hash = hash.substring(1);
    }
    const hashParams: Record<string, string> = {};
    hash.split("&").map((hk) => {
      //split method taken from https://stackoverflow.com/a/4607799/863487
      const hashParamKVP = hk.split(/=(.*)/s).slice(0, 2);
      if (hashParamKVP.length === 2) {
        hashParams[hashParamKVP[0].toLowerCase()] = decodeURI(hashParamKVP[1]);
      }
    });
    return hashParams;
  }

  /**
 * Extracts an individual parameter from a URL #hash
 * @param hash The hash as a string
 * @param paramName The key of the paramater to extract
 * @returns The matching parameter as a key/value record, or null if the key wasn't found
 */
  static extractParamFromHash(hash: string, paramName: string) {
    const hashParams = this.extractParamsFromHash(hash);
    if (hashParams[paramName]) {
      return hashParams[paramName];
    }
    return null;
  }

  /**
   * Checks to see if the specified storage type is available in the browser
   * @param type localStorage or sessionStorage
   */
  static storageAvailable(type: "localStorage" | "sessionStorage"): boolean {
    let storage: Storage;

    try {
      storage =
        type === "localStorage" ? window.localStorage : window.sessionStorage;
      const x = "__storage_test__";
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return (
        e instanceof DOMException &&
        // everything except Firefox
        (e.name === "QuotaExceededError" ||
          // Firefox
          e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
        // acknowledge QuotaExceededError only if there's something already stored
        storage &&
        storage.length !== 0
      );
    }
  }

  /**
   * Combines two URLSearchParams into one, with optional overwriting
   * @author Adapted from https://stackoverflow.com/a/67339954/863487 by StackOverflow user 'Thomas'
   * */
  static combineURLSearchParams(
    a: URLSearchParams,
    b: URLSearchParams,
    overwrite = false,
  ): URLSearchParams {
    const fn = overwrite ? a.set : a.append;
    for (const [key, value] of new URLSearchParams(b)) {
      fn.call(a, key, value);
    }
    return a;
  }
}

export class Color {
  /**
   * Converts individual Red/Green/Blue values to a hex representation
   * @param r The red channel value
   * @param g The green channel value
   * @param b The blue channel value
   * @returns A hex string representation of the colour
   * @author StackOverflow user Tim Down https://stackoverflow.com/a/5624139/863487
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  /**
   * Converts a hex colourstring into an RGB prepresentation of the colour
   * @param hex The hex colour string
   * @returns An object with individual r, g and b values, or null if the conversion was unsuccessful
   * @author StackOverflow user Tim Down https://stackoverflow.com/a/5624139/863487
   */
  static hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}

export class Helper {
  /**
   * Adds a generic overlay with a loading spinner and text to an element
   * @param ele The element to add the generic overlay to
   * @param position The position within the ele to place the loading spinner
   * @param [text="Loading"] Optional text to put below the spinner. Defaults to 'Loading'
   */
  static addLoadingOverlayToElement(
    ele: HTMLElement,
    position: InsertPosition,
    text: string = "Loading"
  ): void {
    const loadingOverlayHTML = `<div class="gifw-loading-overlay" style="min-height: 7rem;">
                    <div class="position-absolute start-50 translate-middle" style="margin-top: 1rem;">
                        <div class="spinner-border mx-auto" style="width: 3rem;height: 3rem;" role="status">
                        </div>
                    </div>
                    <div class="position-absolute start-50 translate-middle" style="margin-top: 4rem;">
                        <p>${text}</p>
                    </div>
                    <button class="btn btn-cancel position-absolute start-50 translate-middle" style="margin-top: 6rem;" type="button">Cancel</button>
                </div>`;
    ele.insertAdjacentHTML(position, loadingOverlayHTML);
    ele.querySelector(".btn-cancel").addEventListener("click", () => {
      ele.dispatchEvent(new Event("gifw-cancel"));
    });
  }

  /**
   * Removes a loading overlay (if it exists) from an element
   * @param ele The element to remove the loading overlay from
   */
  static removeLoadingOverlayFromElement(ele: HTMLElement): void {
    const loadingOverlay = ele.querySelector(
      ".gifw-loading-overlay",
    ) as HTMLElement;
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }

  /**
   * Adds a full screen loading 
   * @param mapId
   * @param loadingText
   * @param cancellable
   * @param cancelCallback
   */
  static addFullScreenLoader(
    mapId: string,
    loadingText?: string,
    cancellable?: boolean,
    cancelCallback?: () => void,
  ) {
    let loadingTakeoverHTML = `<div class="w-100 h-100 position-fixed top-0 start-0 gifw-full-screen-loader">
                    <div class="position-absolute top-50 start-50 translate-middle" style="
                        color: white;
                        text-align: center;
                    "><div class="spinner-border" role="status" style="
                        color: white;
                    ">
                      <span class="visually-hidden">${loadingText}</span>

                    </div><p>${loadingText}</p>`;
    if (cancellable) {
      loadingTakeoverHTML += `<button class="btn btn-lg btn-danger">Cancel</button>`;
    }
    loadingTakeoverHTML += `</div></div>`;
    const mapEle = document.getElementById(`${mapId}Container`);
    mapEle.insertAdjacentHTML("afterbegin", loadingTakeoverHTML);

    if (cancellable && cancelCallback) {
      const cancelButton = mapEle.querySelector(
        ".gifw-full-screen-loader button",
      );
      cancelButton.addEventListener(
        "click",
        () => {
          cancelCallback();
          this.removeFullScreenLoader(mapId);
        },
        { once: true },
      );
    }
  }

  static removeFullScreenLoader(mapId: string) {
    const mapEle = document.getElementById(`${mapId}Container`);
    if (mapEle.querySelector(".gifw-full-screen-loader")) {
      //just in case there is more than one
      mapEle.querySelectorAll(".gifw-full-screen-loader").forEach((e) => {
        e.remove();
      });
    }
  }

  /**
   * Removes the trailing slash from a string if it exists
   * @param str The string you want to remove a trailing slash from
   * @returns The string without a trailing slash
   * @author Seth Holladay/StackOverlow https://stackoverflow.com/a/36242700/863487
   */
  static stripTrailingSlash(str: string) {
    return str.endsWith("/") ? str.slice(0, -1) : str;
  }

  /**
   * Base64 encode a unicode string
   * @param str The string to encode
   * @author MDN https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
   */
  static b64EncodeUnicode(str: string) {
    return btoa(encodeURIComponent(str));
  }

  /**
   * Decode a Base64 string to a unicode string
   * @param str The string to decode
   * @author MDN https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
   */
  static UnicodeDecodeB64(str: string) {
    return decodeURIComponent(atob(str));
  }

  static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets all parents of a child with specified selector
   * Taken from https://stackoverflow.com/a/63797332/863487 CC-BY-SA 4.0 by JaredMcAteer https://stackoverflow.com/users/577926/jaredmcateer
   * @param child
   * @param selector
   */
  static getAllParentElements(
    child: HTMLElement,
    selector: string = "*",
  ): HTMLElement[] {
    const parents: HTMLElement[] = [];

    let parent: HTMLElement = child.parentElement?.closest(selector);
    while (parent) {
      parents.push(parent);
      parent = parent.parentElement?.closest(selector);
    }

    return parents;
  }

  /**
   * Gets the individual keys for a key/value pair object
   * @param obj An object of Key Value pairs
   * @returns A list of strings
   */
  static getKeysFromObject(obj: object) {
    const keys: string[] = [];
    for (const [key] of Object.entries(obj)) {
      keys.push(key);
    }
    return keys;
  }

  /**
   * Gets an individual value from a key value pair based on a key name
   * @param obj An object of Key Value pairs
   * @param keyName The name of the key we want to extract the value from
   * @returns The value we want to extract, or null if the key was not found
   */
  static getValueFromObjectByKey(obj: object, keyName: string) {
    if (obj) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase() === keyName.toLowerCase()) {
          return value;
        }
      }
    }
    return null;
  }

  /**
   * @description
   * Takes an Array<V>, and a grouping function,
   * and returns a Map of the array grouped by the grouping function.
   *
   * @param list An array of type V.
   * @param keyGetter A Function that takes the the Array type V as an input, and returns a value of type K.
   *                  K is generally intended to be a property key of V.
   *
   * @returns Map of the array grouped by the grouping function.
   * @author StackOverlow user mortb - https://stackoverflow.com/a/38327540/863487
   */
  static groupBy<K, V>(
    list: Array<V>,
    keyGetter: (input: V) => K,
  ): Map<K, Array<V>> {
    const map = new Map<K, Array<V>>();
    list.forEach((item) => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    });
    return map;
  }
}

export class CustomError {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  content: string;
  /**
   * Ctor for a custom error
   * @param errorType The error type to show, either Popup (an interrupting modal overlay) or Toast (a non intrusive notification in the bottom left)
   * @param severity The severity level of the notification
   * @param title The title of the notification
   * @param content The content of the notification, as a plain string or HTML
   */
  constructor(
    errorType: AlertType,
    severity: AlertSeverity,
    title: string,
    content: string,
  ) {
    this.type = errorType;
    this.severity = severity;
    this.title = title;
    this.content = content;
  }

  public show() {
    let alert: Alert;
    if (this.type === AlertType.Popup) {
      alert = new Alert(
        this.type,
        this.severity,
        this.title,
        this.content,
        "#gifw-error-modal",
      );
    } else if (this.type === AlertType.Toast) {
      alert = new Alert(
        this.type,
        this.severity,
        this.title,
        this.content,
        "#gifw-error-toast",
      );
    }
    alert.show();
  }
}

export class File {
  /**
   * Gets the extension from a filename
   *
   * @returns The lower case extension
   * @author https://stackoverflow.com/users/1249581/vision
   * @copyright https://stackoverflow.com/a/12900504/863487 CC-BY-SA 4.0
   */
  static getExtension(path: string): string {
    const basename = path.split(/[\\/]/).pop(), // extract file name from full path ...
      // (supports `\\` and `/` separators)
      pos = basename.lastIndexOf("."); // get last position of `.`

    if (basename === "" || pos < 1)
      // if file name is empty or ...
      return ""; //  `.` not found (-1) or comes first (0)

    return basename.slice(pos + 1).toLowerCase(); // extract extension ignoring `.`
  }

  static getFileNameWithoutExtension(path: string): string {
    const ext = this.getExtension(path);
    const fileName = path.replace(`.${ext}`, "");
    return fileName;
  }
}

export class Style {
  /**
   * Returns an OpenLayers style based on Geometry type and map theme
   * @param geomType The type of geometry (Point, MultiPoint, Polygon, MultiPolygon, LineString, MultiLineString)
   * @param theme The current map theme
   * @returns An OpenLayers style
   */
  static getDefaultStyleByGeomType(geomType: string, theme: Theme): olStyle {
    const rgbColor = Color.hexToRgb(theme.primaryColour);
    let strokeColor = "rgb(0,0,0)";
    let fillColor = "rgba(255, 255, 255, 0.2)";
    let fillColorSolid = "rgb(255, 255, 255)";
    if (rgbColor) {
      strokeColor = `rgb(${rgbColor.r},${rgbColor.g},${rgbColor.b})`;
      fillColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`;
      fillColorSolid = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`;
    }
    if (geomType === "LineString" || geomType === "MultiLineString") {
      return new olStyle({
        stroke: new Stroke({
          color: strokeColor,
          width: 3,
        }),
      });
    } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
      return new olStyle({
        fill: new Fill({
          color: fillColor,
        }),
        stroke: new Stroke({
          color: strokeColor,
          width: 3,
        }),
      });
    } else if (geomType === "Point" || geomType === "MultiPoint") {
      return new olStyle({
        image: new Circle({
          fill: new Fill({
            color: fillColorSolid,
          }),
          radius: 5,
          stroke: new Stroke({
            color: "#000",
            width: 1,
          }),
        }),
      });
    }
  }
}

export class Alert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  content: string;
  errorElement: HTMLElement;
  /**
   * Constructor for an Alert which can be shown and hidden
   * @param alertType The alert type to show, either Popup (an interrupting modal overlay) or Toast (a non intrusive notification in the bottom left)
   * @param severity The severity level of the notification
   * @param title The title of the notification
   * @param content The content of the notification, as a plain string or HTML
   * @param errorElementSelector A selector for the existing DOM element to use for the notification
   */
  constructor(
    alertType: AlertType,
    severity: AlertSeverity,
    title: string,
    content: string,
    errorElementSelector: string,
  ) {
    this.type = alertType;
    this.severity = severity;
    this.title = title;
    this.content = content;
    this.errorElement = document.querySelector(errorElementSelector);
  }

  public show() {
    if (this.type === AlertType.Popup) {
      const popup = Modal.getOrCreateInstance(this.errorElement, {});
      this.errorElement.querySelector(".modal-title").textContent = this.title;
      this.errorElement.querySelector(".modal-body").innerHTML = this.content;
      //colourize
      switch (this.severity) {
        case AlertSeverity.Warning:
          this.errorElement
            .querySelector(".modal-header")
            .classList.remove("bg-danger", "text-white", "bg-success");
          this.errorElement
            .querySelector(".modal-header")
            .classList.add("bg-warning");
          break;
        case AlertSeverity.Danger:
          this.errorElement
            .querySelector(".modal-header")
            .classList.remove("bg-warning", "bg-success");
          this.errorElement
            .querySelector(".modal-header")
            .classList.add("bg-danger", "text-white");
          break;
        case AlertSeverity.Success:
          this.errorElement
            .querySelector(".modal-header")
            .classList.remove("bg-warning", "bg-danger");
          this.errorElement
            .querySelector(".modal-header")
            .classList.add("bg-success", "text-white");
          break;
        default:
          this.errorElement
            .querySelector(".modal-header")
            .classList.remove(
              "bg-danger",
              "bg-warning",
              "bg-success",
              "text-white",
            );
          break;
      }
      popup.show();
    } else if (this.type === AlertType.Toast) {
      const toast = Toast.getOrCreateInstance(this.errorElement);

      this.errorElement.querySelector(".toast-body span").innerHTML =
        this.content;

      if (this.errorElement.querySelector(".toast-header") !== null) {
        this.errorElement.querySelector(".toast-header span").textContent =
          this.title;

        //colourize header
        switch (this.severity) {
          case AlertSeverity.Warning:
            this.errorElement
              .querySelector(".toast-header")
              .classList.remove("bg-danger", "text-white", "bg-success");
            this.errorElement
              .querySelector(".toast-header")
              .classList.add("bg-warning");
            break;
          case AlertSeverity.Danger:
            this.errorElement
              .querySelector(".toast-header")
              .classList.remove("bg-warning", "bg-success");
            this.errorElement
              .querySelector(".toast-header")
              .classList.add("bg-danger", "text-white");
            break;
          case AlertSeverity.Success:
            this.errorElement
              .querySelector(".toast-header")
              .classList.remove("bg-warning", "bg-danger");
            this.errorElement
              .querySelector(".toast-header")
              .classList.add("bg-success", "text-white");
            break;
          default:
            this.errorElement
              .querySelector(".toast-header")
              .classList.remove(
                "bg-danger",
                "bg-warning",
                "bg-success",
                "text-white",
              );
            break;
        }
      }
      toast.show();
    }
  }

  public hide() {
    if (this.type === AlertType.Popup) {
      const popup = new Modal(this.errorElement, {});
      popup.hide();
    } else if (this.type === AlertType.Toast) {
      const toast = Toast.getOrCreateInstance(this.errorElement);
      toast.hide();
    }
  }

  /**
   * Shows a generic error popup
   * @param title The title of the error message
   * @param content The content of the error message, as a plain string or HTML
   */
  static showPopupError(title: string, content: string) {
    const alert = new Alert(
      AlertType.Popup,
      AlertSeverity.Danger,
      title,
      content,
      "#gifw-error-modal",
    );
    alert.show();
  }

  /**
   * Shows a notification toast that automatically dismisses after 4 seconds.
   * @param title The title of the notification
   * @param content The content of the notification, as a plain string or HTML
   * @param severity The Severity level of the notification, which controls the styling of the notification
   */
  static showTimedToast(
    title: string,
    content: string,
    severity: AlertSeverity = AlertSeverity.Info,
  ) {
    const alert = new Alert(
      AlertType.Toast,
      severity,
      title,
      content,
      "#gifw-timed-toast",
    );
    (
      document.querySelector("#gifw-timed-toast .progress-bar") as HTMLElement
    ).style.transition = "none";
    (
      document.querySelector("#gifw-timed-toast .progress-bar") as HTMLElement
    ).style.width = "0%";
    alert.show();
    (
      document.querySelector("#gifw-timed-toast .progress-bar") as HTMLElement
    ).style.transition = "width 4s linear";
    (
      document.querySelector("#gifw-timed-toast .progress-bar") as HTMLElement
    ).style.width = "100%";
  }
}

export class Mapping {
  /**
   * Extracts custom HTTP header options from the layer source
   * @param layerSource The layer source to extract header options from
   * @returns Headers object
   */
  static extractCustomHeadersFromLayerSource(
    layerSource: LayerSource,
  ): Headers {
    const customHeaders = new Headers();
    if (layerSource && layerSource.layerSourceOptions) {
      if (
        layerSource.layerSourceOptions.find(
          (l) => l.name.toLowerCase() === "headers",
        )
      ) {
        const headersJson = JSON.parse(
          layerSource.layerSourceOptions.find(
            (l) => l.name.toLowerCase() === "headers",
          ).value,
        );
        const keys = Helper.getKeysFromObject(headersJson);
        keys.forEach((key) => {
          customHeaders.append(key, headersJson[key]);
        });
      }
    }
    return customHeaders;
  }

  /**
   * Generates a permalink (or 'share link') based on the current map
   * @param map The GIFramework Map object
   * @param includeSearchResults Whether to include any search result pins
   * @returns A string with a URL to the current map view
   */
  static generatePermalinkForMap(
    map: GIFWMap,
    includeSearchResults: boolean = true,
  ): string {
    //get the current view
    const view = map.olMap.getView();
    const center = view.getCenter();
    const projectionCode = view.getProjection().getCode();
    const lonlat = toLonLat(center, view.getProjection());
    let hash = `#map=${view.getZoom().toFixed(2)}/${lonlat[1].toFixed(
      5,
    )}/${lonlat[0].toFixed(5)}/${view.getRotation()}`;

    //get turned on layers
    if (map.anyOverlaysOn()) {
      const layerGroup = map.getLayerGroupOfType(LayerGroupType.Overlay);

      const layers: olLayer<Source, LayerRenderer<olLayer>>[] =
        layerGroup.olLayerGroup.getLayersArray();

      const switchedOnLayers = layers.filter(
        (l) => l.getVisible() === true && l.get("gifw-is-user-layer") !== true,
      );
      if (switchedOnLayers.length !== 0) {
        hash += "&layers=";
        const layerIds = switchedOnLayers
          .sort((a, b) => b.getZIndex() - a.getZIndex())
          .map((x) => {
            const layerSource = x.getSource();
            let styleName: string = "";
            if (
              layerSource instanceof TileWMS ||
              layerSource instanceof ImageWMS
            ) {
              styleName = layerSource.getParams()?.STYLES || "";
            }
            return `${x.get("layerId")}/${(x.getOpacity() * 100).toFixed(
              0,
            )}/${x.get("saturation")}/${styleName}`;
          });
        hash += layerIds.join(",");
      }
    }

    //get basemap
    const activeBasemap = map.getActiveBasemap();
    hash += `&basemap=${activeBasemap.get("layerId")}/${(
      activeBasemap.getOpacity() * 100
    ).toFixed(0)}/${activeBasemap.get("saturation")}`;

    if (includeSearchResults) {
      //get the search results pin
      const searchResultsLayer = map.getLayerById("__searchresults__");

      const source: VectorSource = (
        searchResultsLayer as VectorLayer
      ).getSource();
      const features = source.getFeatures();
      if (features.length === 1) {
        const searchResultFeature = features[0];
        const geom = searchResultFeature.getGeometry();
        if (geom instanceof Point) {
          const coords = (geom as SimpleGeometry).getCoordinates();
          const popupOptions = searchResultFeature.get(
            "gifw-popup-opts",
          ) as GIFWPopupOptions;
          const searchResultData = {
            content: popupOptions.content,
            title: searchResultFeature.get("gifw-popup-title"),
          };
          try {
            const encodedSRData = Helper.b64EncodeUnicode(
              JSON.stringify(searchResultData),
            );
            hash += `&sr=${coords[0]},${coords[1]}&srepsg=${projectionCode.replace("EPSG:", "")}&srdata=${encodedSRData}`;
          } catch (e) {
            console.warn(
              "Could not generate search result component for permalink",
            );
            console.warn(e);
          }
        }
      }
    }
    if (map.mode === 'embed') {
      hash += '&embed=true';
    }
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}${hash}`;
  }

  /**
   * Calculates an appropriate animation speed based on the zoom difference between current location and target location
   *
   * @param zoomDiff - The zoom level difference between the target and current location
   * @returns a number between 200 and 3000 indicating the recommended animation speed (in milliseconds)
   *
   */
  static calculateAnimationSpeed(zoomDiff: number): number {
    let speed = 200;
    if (zoomDiff > 1 && zoomDiff <= 5) {
      speed = 500;
    } else if (zoomDiff > 5 && zoomDiff <= 10) {
      speed = 1000;
    } else if (zoomDiff > 10 && zoomDiff <= 15) {
      speed = 1500;
    } else if (zoomDiff > 15 && zoomDiff <= 20) {
      speed = 2500;
    } else if (zoomDiff > 20) {
      speed = 3000;
    }
    return speed;
  }

  /**
   * Gets the first matching option from a list of LayerSourceOption by key name and returns the value
   * @param sourceOpts The list of LayerSourceOption
   * @param keyName The key name to find
   * @returns The Value of the first LayerSourceOption from the list that matches the key, or null
   */
  static getLayerSourceOptionValueByName(sourceOpts: LayerSourceOption[], keyName: string): string {
    const selectedOpt = sourceOpts.filter((o) => {
      return o.name == keyName;
    });
    if (selectedOpt.length !== 0) {
      return selectedOpt[0].value;
    }
    return null;
  }

  /**
   * Gets the appropriate OpenLayers vector format based on a format string
   * @param format The format string to convert to an OpenLayers format. Generally a MIME type or map server format string
   * @returns an OpenLayers Format of GML32, GML3, GML2, GeoJSON or KML. Defaults to GeoJSON if no match is found
   */
  static getOpenLayersFormatFromOGCFormat(format: string) {
    const formatStringToOpenLayersFormatMap = new Map();
    formatStringToOpenLayersFormatMap.set("application/gml+xml; version=3.2", new GML32());
    formatStringToOpenLayersFormatMap.set("text/xml; subtype=gml/3.2", new GML32());
    formatStringToOpenLayersFormatMap.set("gml32", new GML32());
    formatStringToOpenLayersFormatMap.set("text/xml; subtype=gml/3.1.1", new GML3());
    formatStringToOpenLayersFormatMap.set("gml3", new GML3());
    formatStringToOpenLayersFormatMap.set("text/xml; subtype=gml/2.1.2", new GML2());
    formatStringToOpenLayersFormatMap.set("gml2", new GML2());
    formatStringToOpenLayersFormatMap.set("application/json", new GeoJSON());
    formatStringToOpenLayersFormatMap.set("text/json", new GeoJSON());
    formatStringToOpenLayersFormatMap.set("geojson", new GeoJSON());
    formatStringToOpenLayersFormatMap.set("json", new GeoJSON());
    formatStringToOpenLayersFormatMap.set("application/vnd.google-earth.kml xml", new KML());
    formatStringToOpenLayersFormatMap.set("application/vnd.google-earth.kml+xml", new KML());
    formatStringToOpenLayersFormatMap.set("kml", new KML());
    if (formatStringToOpenLayersFormatMap.has(format.toLowerCase())) {
      return formatStringToOpenLayersFormatMap.get(format.toLowerCase());
    }
    return new GeoJSON();
  }

  /**
   * Creates a WFS feature request URL from a Layer
   * @param layer The WFS layer to create a GetFeature request from
   * @returns A WFS feature request URL as a string
   */
  static createWFSFeatureRequestFromLayer(layer: Layer) {
    const sourceUrlOpt = this.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const formatOpt = this.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "format") || 'application/json';
    const versionOpt = this.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "version") || '1.1.0';
    const typeName = this.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "typename");
    const wfsURL = new URL(sourceUrlOpt);
    //add the WFS request bits on
    wfsURL.searchParams.set('request', 'GetFeature');
    wfsURL.searchParams.set('version', versionOpt);
    wfsURL.searchParams.set('typename', typeName);
    wfsURL.searchParams.set('outputFormat', formatOpt);
    const paramsOpt = this.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "params");
    if (paramsOpt !== null) {
      const params: { [x: string]: string } = JSON.parse(paramsOpt);
      const additionalWFSRequestParams = new URLSearchParams(params);
      for (const p of additionalWFSRequestParams) {
        wfsURL.searchParams.set(p[0], p[1])
      }
    }
    return wfsURL.toString();
  }
}


export const enum AlertType {
  Popup,
  Toast,
}
export const enum AlertSeverity {
  Danger,
  Warning,
  Info,
  Success,
}
