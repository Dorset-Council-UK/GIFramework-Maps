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
import { b64EncodeUnicode, UnicodeDecodeB64 } from "./Util";
import { extractParamsFromHash } from "./Util";
import { debounce, DebouncedFunc } from "lodash";
import { Basemap } from "./Interfaces/Basemap";
import { Layer } from "./Interfaces/Layer";
import CQL from "./OL Extensions/CQL";

/**
 * Encodes a string to URL-safe base64
 * @param str The string to encode
 * @returns URL-safe base64 encoded string
 */
export function base64UrlEncode(str: string): string {
  try {
    // Use btoa for base64 encoding, then make it URL-safe
    return b64EncodeUnicode(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch (e) {
    console.warn("Could not encode filter to base64", e);
    return "";
  }
}

/**
 * Decodes a URL-safe base64 string
 * @param str The URL-safe base64 string to decode
 * @returns Decoded string
 */
export function base64UrlDecode(str: string): string {
  try {
    // Convert URL-safe base64 back to standard base64
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    while (base64.length % 4) {
      base64 += "=";
    }
    // Use UnicodeDecodeB64 for proper Unicode support
    return UnicodeDecodeB64(base64);
  } catch (e) {
    console.warn("Could not decode filter from base64", e);
    return "";
  }
}

/**
 * Extracts the user-applied CQL filter from a layer source, excluding non-editable default filters
 * @param layer The OpenLayers layer
 * @param layerConfig The layer configuration (can be null)
 * @returns The user-applied CQL filter string or empty string if none
 */
function getLayerCQLFilter(
  layer: olLayer<Source, LayerRenderer<olLayer>>,
  layerConfig: Layer | null,
): string {
  // First, check if there's a user-applied filter stored on the layer
  // This is the filter the user has explicitly applied, NOT including default filters
  const appliedFilter = layer.get("gifw-filter-applied");
  if (appliedFilter) {
    // The filter needs to be converted to CQL string
    const cqlFormatter = new CQL();
    return cqlFormatter.write(appliedFilter);
  }

  // If no explicit user filter is applied, check the source params
  const source = layer.getSource();
  if (source instanceof TileWMS || source instanceof ImageWMS) {
    const params = source.getParams();
    let cqlFilter = "";
    for (const property in params) {
      if (property.toLowerCase() === "cql_filter") {
        cqlFilter = params[property] || "";
        break;
      }
    }
    
    if (cqlFilter) {
      // Check if there's a default filter that should NOT be included in the permalink
      const defaultFilter = layer.get("gifw-default-filter");
      if (defaultFilter && layerConfig && !layerConfig.defaultFilterEditable) {
        // If the default filter is non-editable, it should not be in the permalink
        // The default filter is already applied to the layer, so we shouldn't include it
        // If the current filter IS the default filter, return empty (no user filter)
        if (cqlFilter === defaultFilter) {
          return "";
        }
        // If the current filter contains the default filter wrapped in the combined format,
        // extract just the user filter portion
        // Format: (defaultFilter) AND (userFilter)
        const prefix = `(${defaultFilter}) AND (`;
        if (cqlFilter.startsWith(prefix) && cqlFilter.endsWith(")")) {
          // Extract the user filter portion
          return cqlFilter.slice(prefix.length, -1);
        }
      }
      return cqlFilter;
    }
  } else if (source instanceof VectorSource) {
    // For vector layers without gifw-filter-applied, there's no user filter
    return "";
  }
  return "";
}

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
          
          // Get the layer config to check defaultFilterEditable
          const layerId = x.get("layerId");
          const layerConfig = map.getLayerConfigById(layerId, [LayerGroupType.Overlay]);
          
          // Get the CQL filter for this layer (excluding non-editable default filters)
          const cqlFilter = getLayerCQLFilter(x, layerConfig);
          const encodedFilter = cqlFilter ? base64UrlEncode(cqlFilter) : "";
          
          return `${layerId}/${(x.getOpacity() * 100).toFixed(
            0
          )}/${x.get("saturation")}/${styleName}/${encodedFilter}`;
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

/**
 * Updates the base map using link parameters.
 * @param map The GIFramework Map object
 * @param params The full link parameters (whole fragment)
 * @returns void
 */
export function updateBaseMapFromLinkParams(
  map: GIFWMap,
  params: Record<string, string>
): void {
  // If no basemap parameters are provided, exit
  if (!params.basemap) {
    return;
  }

  // Pull apart the basemap parameters
  const baseMapParams = params.basemap.split("/").map((x) => Number(x.trim()));

  // No basemap ID provided
  if (!baseMapParams[0]) {
    return;
  }

  // Set Layer ID if layer exists
  let activeBasemap: Basemap | undefined;
  for (const basemap of map.config.basemaps) {
    if (basemap.id == String(baseMapParams[0])) {
      // If the basemap is found, set it as the active basemap
      activeBasemap = basemap;
    } else {
      basemap.isDefault = false;
    }
  }

  if (!activeBasemap) {
    // If no matching basemap is found use the first as the default basemap
    activeBasemap = map.config.basemaps[0];
  }

  activeBasemap.isDefault = true;

  // Set Opacity
  if (baseMapParams[1] < 100 && baseMapParams[1] >= 0) {
    activeBasemap.defaultOpacity = baseMapParams[1];
  } else {
    activeBasemap.defaultOpacity = 100;
  }

  // Set Saturation
  if (baseMapParams[2] < 100 && baseMapParams[2] >= 0) {
    activeBasemap.defaultSaturation = baseMapParams[2];
  } else {
    activeBasemap.defaultSaturation = 100;
  }
}
