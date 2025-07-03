import { GIFWMap } from "./Map";
import { toLonLat } from "ol/proj";
import { Layer as olLayer } from "ol/layer";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Point, SimpleGeometry } from "ol/geom";
import { GIFWPopupOptions } from "./Popups/PopupOptions";
import { ImageWMS, Source, TileWMS } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";
import { b64EncodeUnicode } from "./Util";
import { extractParamsFromHash } from "./Util";
import { debounce, DebouncedFunc } from "lodash";

/**
 * Generates a permalink (or 'share link') based on the current map
 * @param map The GIFramework Map object
 * @param includeSearchResults Whether to include any search result pins
 * @returns A string with a URL to the current map view
 */
export function generatePermalinkForMap(
  map: GIFWMap,
  includeSearchResults: boolean = true
): string {
  //get the current view
  const view = map.olMap.getView();
  const center = view.getCenter();
  const projectionCode = view.getProjection().getCode();
  const lonlat = toLonLat(center, view.getProjection());
  let hash = `#map=${view.getZoom().toFixed(2)}/${lonlat[1].toFixed(
    5
  )}/${lonlat[0].toFixed(5)}/${view.getRotation()}`;

  //get turned on layers
  if (map.anyOverlaysOn()) {
    const layerGroup = map.getLayerGroupOfType(LayerGroupType.Overlay);

    const layers: olLayer<Source, LayerRenderer<olLayer>>[] =
      layerGroup.olLayerGroup.getLayersArray();

    const switchedOnLayers = layers.filter(
      (l) => l.getVisible() === true && l.get("gifw-is-user-layer") !== true
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
            0
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
          "gifw-popup-opts"
        ) as GIFWPopupOptions;
        const searchResultData = {
          content: popupOptions.content,
          title: searchResultFeature.get("gifw-popup-title"),
        };
        try {
          const encodedSRData = b64EncodeUnicode(
            JSON.stringify(searchResultData)
          );
          hash += `&sr=${coords[0]},${coords[1]}&srepsg=${projectionCode.replace("EPSG:", "")}&srdata=${encodedSRData}`;
        } catch (e) {
          console.warn(
            "Could not generate search result component for permalink"
          );
          console.warn(e);
        }
      }
    }
  }
  if (map.mode === "embed") {
    hash += "&embed=true";
  }
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}${hash}`;
}

/**
 * Updates the permalink in the browser URL bar and pushes it into the history
 * @param map The GIFramework Map object
 */
export function updatePermalinkInURL(map: GIFWMap): void {
  const permalink = generatePermalinkForMap(map);
  const hashParams = extractParamsFromHash(
    permalink.substring(permalink.indexOf("#"))
  );

  window.history.replaceState(hashParams, "", permalink);
}

export function updatePermalinkInLinks(map: GIFWMap): void {
  const permalink = generatePermalinkForMap(map);
  document
    .querySelectorAll("a[data-gifw-permalink-update-uri-param]")
    .forEach((link) => {
      const paramToUpdate = (link as HTMLAnchorElement).dataset
        .gifwPermalinkUpdateUriParam;
      const existingLink = new URL((link as HTMLAnchorElement).href);
      existingLink.searchParams.set(paramToUpdate, permalink);
      (link as HTMLAnchorElement).href = existingLink.toString();
    });
}

/**
 * Updates the permalink in the browser URL bar and pushes it into the history
 * @param map The GIFramework Map object
 */
export function permaLinkDelayedUpdate(
  map: GIFWMap
): DebouncedFunc<() => void> {
  return debounce(() => {
    document
      .getElementById(map.id)
      .dispatchEvent(new CustomEvent("gifw-update-permalink"));
  }, 500);
}
