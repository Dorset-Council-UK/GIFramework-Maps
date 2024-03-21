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
import { LayerSource } from "./Interfaces/Layer";
import LayerRenderer from "ol/renderer/Layer";

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
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
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
  static addLoadingOverlayToElement(
    ele: HTMLElement,
    position: InsertPosition,
  ): void {
    const loadingOverlayHTML = `<div class="gifw-loading-overlay" style="min-height: 7rem;">
                    <div class="position-absolute start-50 translate-middle" style="margin-top: 1rem;">
                        <div class="spinner-border mx-auto" style="width: 3rem;height: 3rem;" role="status">
                        </div>
                    </div>
                    <div class="position-absolute start-50 translate-middle" style="margin-top: 4rem;">
                        <p>Searching</p>
                    </div>
                    <button class="btn btn-cancel position-absolute start-50 translate-middle" style="margin-top: 6rem;" type="button">Cancel</button>
                </div>`;
    ele.insertAdjacentHTML(position, loadingOverlayHTML);
    ele.querySelector(".btn-cancel").addEventListener("click", () => {
      ele.dispatchEvent(new Event("gifw-cancel"));
    });
  }

  static removeLoadingOverlayFromElement(ele: HTMLElement): void {
    const loadingOverlay = ele.querySelector(
      ".gifw-loading-overlay",
    ) as HTMLElement;
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }

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
                      <span class="visually-hidden">Loading...</span>

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

  static getKeysFromObject(obj: object) {
    const keys: string[] = [];
    for (const [key] of Object.entries(obj)) {
      keys.push(key);
    }
    return keys;
  }

  static getValueFromObjectByKey(obj: object, keyName: string) {
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase() === keyName.toLowerCase()) {
        return value;
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
   * Results an OpenLayers tyle based on geometry type and theme
   *
   *
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
  constructor(
    errorType: AlertType,
    severity: AlertSeverity,
    title: string,
    content: string,
    errorElementSelector: string,
  ) {
    this.type = errorType;
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
        searchResultsLayer as VectorLayer<VectorSource>
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
