/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BasicServerCapabilities,
  Capability,
  CapabilityType,
} from "../Interfaces/OGCMetadata/BasicServerCapabilities";
import { DescribeFeatureType } from "../Interfaces/OGCMetadata/DescribeFeatureType";
import {
  evaluateXPath,
  evaluateXPathToFirstNode,
} from "fontoxpath";
import { LayerResource } from "../Interfaces/OGCMetadata/LayerResource";
import { combineURLSearchParams } from "../Util";
import { GenericEndpointInfo, WfsEndpoint, WmsEndpoint, WmsLayerSummary, setFetchOptions as ogcClientSetFetchOptions, enableFallbackWithoutWorker as ogcClientEnableFallbackWithoutWorker } from "@camptocamp/ogc-client";
import { ServiceType } from "../Interfaces/WebLayerServiceDefinition";

export async function getCapabilities(
  baseUrl: string,
  serviceType: ServiceType = ServiceType.WMS,
  version: string = "1.1.0",
  proxyEndpoint: string = "",
  httpHeaders: Headers = new Headers(),
) {
  let fetchUrl = constructGetCapabilitiesURL(baseUrl, serviceType, version);
  if (proxyEndpoint !== "") {
    fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
  }
  const response = await fetch(fetchUrl, { headers: httpHeaders });
  return response;
}

export async function getDescribeFeatureType(
  baseUrl: string,
  featureTypeName: string,
  httpMethod: string,
  outputFormat: string = "application/json",
  proxyEndpoint: string = "",
  additionalUrlParams: object = {},
  httpHeaders: Headers = new Headers(),
): Promise<DescribeFeatureType> {
  const describeFeatureURLParams = new URLSearchParams({
    service: "WFS",
    version: "1.1.0",
    request: "DescribeFeatureType",
    typeName: featureTypeName,
    outputFormat: outputFormat,
    ...additionalUrlParams,
  });

  const baseURLasURL = new URL(baseUrl);
  const baseURLParams = baseURLasURL.searchParams;
  const combinedURLParams = combineURLSearchParams(
    baseURLParams,
    describeFeatureURLParams,
    true,
  );
  let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
  if (proxyEndpoint !== "") {
    fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
  }

  try {
    const response = await fetch(fetchUrl, {
      method: httpMethod,
      headers: httpHeaders,
    });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const json: DescribeFeatureType = await response.json();
    return json;
  } catch (error) {
    console.error(`Could not get feature description: ${error}`);
  }
}

/**
  * Sends a WFS 1.1.0 GetCapabilities request to the baseUrl and returns
  * a stripped down set of basic capabilities.
  * @param baseUrl - The base URL of the OGC server you want to query
  */
export async function getBasicCapabilities(
  baseUrl: string,
  additionalUrlParams: object = {},
  proxyEndpoint: string = "",
  httpHeaders: Headers = new Headers(),
): Promise<BasicServerCapabilities> {
  let fetchUrl = constructGetCapabilitiesURL(
    baseUrl,
    ServiceType.WFS,
    "1.1.0",
    additionalUrlParams,
  );
  if (proxyEndpoint !== "") {
    fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
  }
  try {
    const response = await fetch(fetchUrl, { headers: httpHeaders });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    /*TODO - Make this use jsonix and the ogc-schemas libraries to more effectively and robustly parse the response*/
    const capabilitiesDoc = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(capabilitiesDoc, "application/xml");

    let describeFeatureTypeNode = evaluateXPathToFirstNode(
      `*/*:OperationsMetadata/*:Operation[@name="DescribeFeatureType"]/*:DCP/*:HTTP/*:Get`,
      doc,
      null,
      null,
      {
        language: evaluateXPath.XQUERY_3_1_LANGUAGE,
      },
    ) as Node;
    let describeFeatureTypeURL = (
      describeFeatureTypeNode as any
    ).attributes.getNamedItem("xlink:href").value;

    let describeFeatureMethod: string = "GET";
    if (!describeFeatureTypeURL) {
      describeFeatureTypeNode = evaluateXPathToFirstNode(
        `*/*:OperationsMetadata/*:Operation[@name="DescribeFeatureType"]/*:DCP/*:HTTP/*:Post`,
        doc,
        null,
        null,
        {
          language: evaluateXPath.XQUERY_3_1_LANGUAGE,
        },
      ) as Node;
      describeFeatureTypeURL = (
        describeFeatureTypeNode as any
      ).attributes.getNamedItem("xlink:href").value;
      describeFeatureMethod = "POST";
    }

    //if describe feature URLs are http, but the site is running on https,
    //we must try and upgrade the URL, otherwise it just won't work
    if (document.location.protocol.startsWith("https")) {
      describeFeatureTypeURL = describeFeatureTypeURL.replace(
        "http://",
        "https://",
      );
    }

    const describeFeatureTypeCapability: Capability = {
      url: describeFeatureTypeURL,
      type: CapabilityType.DescribeFeatureType,
      method: describeFeatureMethod,
    };

    let getFeatureNode = evaluateXPathToFirstNode(
      `*/*:OperationsMetadata/*:Operation[@name="GetFeature"]/*:DCP/*:HTTP/*:Post`,
      doc,
      null,
      null,
      {
        language: evaluateXPath.XQUERY_3_1_LANGUAGE,
      },
    ) as Node;
    let getFeatureURL = (getFeatureNode as any).attributes.getNamedItem(
      "xlink:href",
    ).value;

    let getFeatureMethod = "POST";
    if (!getFeatureURL) {
      getFeatureNode = evaluateXPathToFirstNode(
        `*/*:OperationsMetadata/*:Operation[@name="GetFeature"]/*:DCP/*:HTTP/*:Get`,
        doc,
        null,
        null,
        {
          language: evaluateXPath.XQUERY_3_1_LANGUAGE,
        },
      ) as Node;
      getFeatureURL = (getFeatureNode as any).attributes.getNamedItem(
        "xlink:href",
      ).value;
      getFeatureMethod = "GET";
    }

    //if feature URLs are http, but the site is running on https,
    //we must try and upgrade the URL, otherwise it just won't work
    if (document.location.protocol.startsWith("https")) {
      getFeatureURL = getFeatureURL.replace("http://", "https://");
    }
    const getFeatureCapability: Capability = {
      url: getFeatureURL,
      type: CapabilityType.WFS_GetFeature,
      method: getFeatureMethod,
    };

    const basicServerCapabilities: BasicServerCapabilities = {
      capabilities: [describeFeatureTypeCapability, getFeatureCapability],
    };

    return basicServerCapabilities;
  } catch (error) {
    console.error(`Could not get capabilities doc: ${error}`);
  }
}

/**
  * Sends a GetCapabilities request to the baseUrl and returns
  * a list of styles allowed for that layer.
  * @param baseUrl - The base URL of the OGC server you want to query
  * @param layerName - The name of the layer to find in the list
  */
export async function getStylesForLayer(
  baseUrl: string,
  layerName: string,
  proxyEndpoint: string = "",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  additionalUrlParams: object = {},
  httpHeaders: Headers = new Headers(),
) {
  ogcClientEnableFallbackWithoutWorker();
  ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
  if (proxyEndpoint !== "") {
    baseUrl = `${proxyEndpoint}?url=${encodeURIComponent(baseUrl)}`;
  }
  const endpoint = await new WmsEndpoint(baseUrl).isReady();
  const layer = endpoint.getLayerByName(layerName);
  return layer.styles;
    
}

export async function isLayerGroup(baseUrl: string,
  layerName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  version: string = "1.1.0",
  proxyEndpoint: string = "",
  httpHeaders: Headers = new Headers()) {
  ogcClientEnableFallbackWithoutWorker();
  ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
  if (proxyEndpoint !== "") {
    baseUrl = `${proxyEndpoint}?url=${encodeURIComponent(baseUrl)}`;
  }
  const endpoint = await new WmsEndpoint(baseUrl).isReady();
  const layer = endpoint.getLayerByName(layerName);
  if (layer.children) {
    return layer.children.length !== 0;
  }
  return false;
}

export async function getLayerMetadataFromCapabilities(
  baseUrl: string,
  layerName: string,
  type: ServiceType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  version: string = "1.1.0",
  proxyEndpoint: string = "",
  httpHeaders: Headers = new Headers()
) {
  ogcClientEnableFallbackWithoutWorker();
  ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
  if (type === ServiceType.WMS) {
      
    const endpoint = await new WmsEndpoint(baseUrl).isReady();
    const layer = endpoint.getLayerByName(layerName);
    const serviceInfo = endpoint.getServiceInfo();

    const bboxKey = Object.keys(layer.boundingBoxes).find(k => k === "EPSG:4326") || Object.keys(layer.boundingBoxes)[0];

    let attributionHTML = ""
    if (layer.attribution) {
      attributionHTML = layer.attribution.title.replaceAll('{{CURRENT_YEAR}}',new Date().getFullYear().toString());
      if (layer.attribution.url) {
        attributionHTML = `<a href="${layer.attribution.url}" target="_blank" rel="noopener">${attributionHTML}</a>`;
      }
    }

    const layerResource: LayerResource = {
      name: layer.name,
      title: layer.title,
      abstract: layer.abstract,
      attribution: attributionHTML,
      formats: serviceInfo.outputFormats,
      baseUrl: baseUrl,
      projections: layer.availableCrs,
      extent: layer.boundingBoxes[bboxKey], //TODO
      queryable: layer.queryable,
      opaque: layer.opaque,
      version: endpoint.getVersion(),
      proxyMetaRequests: proxyEndpoint !== "" ? true : false,
      proxyMapRequests: proxyEndpoint !== "" ? true : false,
      keywords: layer.keywords,
      properties: null
    };
    return layerResource;
  } else if(type === ServiceType.WFS) {
    const endpoint = await new WfsEndpoint(baseUrl).isReady();
    const layer = await endpoint.getFeatureTypeFull(layerName);
    const serviceInfo = endpoint.getServiceInfo();
    const layerResource: LayerResource = {
      name: layer.name,
      title: layer.title,
      abstract: layer.abstract,
      attribution: "", //TODO?
      formats: serviceInfo.outputFormats,
      baseUrl: baseUrl,
      projections: layer.otherCrs,
      extent: layer.boundingBox,
      queryable: true, //vectors are by definition queryable
      opaque: false, //vectors are by definition, not opaque
      version: endpoint.getVersion(),
      proxyMetaRequests: proxyEndpoint !== "" ? true : false,
      proxyMapRequests: proxyEndpoint !== "" ? true : false,
      keywords: layer.keywords,
      properties: layer.properties
    };
    return layerResource; 
  }
}

export async function getLayersFromCapabilities(
  baseUrl: string,
  serviceType: ServiceType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  version: string = "1.1.0",
  proxyEndpoint: string = "",
  httpHeaders: Headers = new Headers(),
) {
  try {
    const availableLayers: LayerResource[] = [];
    ogcClientEnableFallbackWithoutWorker();
    ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
    if (serviceType === ServiceType.WMS) {
      const endpoint = await new WmsEndpoint(baseUrl).isReady();
      const serviceInfo = endpoint.getServiceInfo();
      const layers = endpoint.getLayers();
      layers.forEach(layer => {
        availableLayers.push(...createLayerResourcesFromWMSLayer(endpoint, layer, serviceInfo, baseUrl, proxyEndpoint))
      })
    } else {
      const endpoint = await new WfsEndpoint(baseUrl).isReady();
      const layers = endpoint.getFeatureTypes();
      const serviceInfo = endpoint.getServiceInfo();

      for (const layer of layers) {
        const layerDetails = await endpoint.getFeatureTypeFull(layer.name);
        const layerResource: LayerResource = {
          name: layer.name,
          title: layer.title,
          abstract: layer.abstract,
          attribution: "",
          formats: serviceInfo.outputFormats,
          baseUrl: baseUrl,
          projections: [layerDetails.defaultCrs, ...layerDetails.otherCrs],
          extent: layerDetails.boundingBox,
          queryable: true,
          opaque: false,
          version: endpoint.getVersion(),
          proxyMetaRequests: proxyEndpoint !== "" ? true : false,
          proxyMapRequests: proxyEndpoint !== "" ? true : false,
          keywords: [],
          properties: layerDetails.properties
        };
          
        availableLayers.push(layerResource);
      }
    }
      
    return availableLayers;
  } catch (error) {
    console.error(`Could not get capabilities doc: ${error}`);
  }
}

export async function getChildrenOfLayerGroup(baseUrl: string,
  layerGroupName: string,
  proxyEndpoint: string = "",
  httpHeaders: Headers = new Headers()) {
  ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
  if (proxyEndpoint !== "") {
    baseUrl = `${proxyEndpoint}?url=${encodeURIComponent(baseUrl)}`;
  }
  const endpoint = await new WmsEndpoint(baseUrl).isReady();
  const layers = endpoint.getLayerByName(layerGroupName);
  return layers.children;
}

export function createLayerResourcesFromWMSLayer(endpoint: WmsEndpoint, layer: WmsLayerSummary, serviceInfo: GenericEndpointInfo, baseUrl: string, proxyEndpoint?: string) {
  const layers: LayerResource[] = [];
  if (layer.children && layer.children.length !== 0) {
    layer.children.forEach(child => layers.push(...createLayerResourcesFromWMSLayer(endpoint, child, serviceInfo, baseUrl, proxyEndpoint)));
  } else {
    const layerResource = createLayerResourceFromWMSLayer(endpoint, layer, serviceInfo, baseUrl, proxyEndpoint);
    layers.push(layerResource);
  }
  return layers;
}

export function createLayerResourceFromWMSLayer(endpoint: WmsEndpoint, layer: WmsLayerSummary, serviceInfo: GenericEndpointInfo, baseUrl: string, proxyEndpoint?: string) {
  const layerDetails = endpoint.getLayerByName(layer.name);
  const bboxKey = Object.keys(layerDetails.boundingBoxes).find(k => k === "EPSG:4326") || Object.keys(layerDetails.boundingBoxes)[0];
  let attributionHTML = ""
  if (layerDetails.attribution) {
    attributionHTML = layerDetails.attribution.title.replaceAll('{{CURRENT_YEAR}}', new Date().getFullYear().toString());
    if (layerDetails.attribution.url) {
      attributionHTML = `<a href="${layerDetails.attribution.url}" target="_blank" rel="noopener">${attributionHTML}</a>`;
    }
  }
  const layerResource: LayerResource = {
    name: layer.name,
    title: layer.title,
    abstract: layer.abstract,
    attribution: attributionHTML,
    formats: serviceInfo.outputFormats,
    baseUrl: baseUrl,
    projections: layerDetails.availableCrs,
    extent: layerDetails.boundingBoxes[bboxKey],
    queryable: layerDetails.queryable,
    opaque: layerDetails.opaque,
    version: endpoint.getVersion(),
    proxyMetaRequests: proxyEndpoint !== "" ? true : false,
    proxyMapRequests: proxyEndpoint !== "" ? true : false,
    keywords: layerDetails.keywords,
    properties: null
  };
  return layerResource;
}

/**
  * Sends a WPS 1.1.0 GetCapabilities request to the baseUrl and returns
  * a stripped down set of basic capabilities.
  * @param baseUrl - The base URL of the OGC server you want to query
  */
export async function getWPSCapabilities(
  baseUrl: string,
  proxyEndpoint: string = "",
  additionalUrlParams: object = {},
  httpHeaders: Headers = new Headers(),
): Promise<BasicServerCapabilities> {
  let fetchUrl = constructGetCapabilitiesURL(
    baseUrl,
    ServiceType.WPS,
    "1.1.0",
    additionalUrlParams,
  );
  if (proxyEndpoint !== "") {
    fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
  }
  try {
    const response = await fetch(fetchUrl, { headers: httpHeaders });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    /*TODO - Make this use jsonix and the ogc-schemas libraries to more effectively and robustly parse the response*/
    const capabilitiesDoc = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(capabilitiesDoc, "application/xml");

    const executeURLNode = evaluateXPathToFirstNode(
      `*/*:OperationsMetadata/*:Operation[@name="Execute"]/*:DCP/*:HTTP/*:Post`,
      doc,
      null,
      null,
      {
        language: evaluateXPath.XQUERY_3_1_LANGUAGE,
      },
    ) as Node;
    let executeURL = (executeURLNode as any).attributes.getNamedItem(
      "xlink:href",
    ).value;
    const executeMethod: string = "POST";

    //if describe feature URLs are http, but the site is running on https,
    //we must try and upgrade the URL, otherwise it just won't work
    /*TODO - If we implement a local YARP proxy, use this*/
    if (document.location.protocol.startsWith("https")) {
      executeURL = executeURL.replace("http://", "https://");
    }

    const executeCapability: Capability = {
      url: executeURL,
      type: CapabilityType.WPS_Execute,
      method: executeMethod,
    };

    let decribeProcessNode = evaluateXPathToFirstNode(
      `*/*:OperationsMetadata/*:Operation[@name="DescribeProcess"]/*:DCP/*:HTTP/*:Get`,
      doc,
      null,
      null,
      {
        language: evaluateXPath.XQUERY_3_1_LANGUAGE,
      },
    ) as Node;
    let decribeProcessURL = (
      decribeProcessNode as any
    ).attributes.getNamedItem("xlink:href").value;
    let decribeProcessMethod: string = "GET";
    if (!decribeProcessURL) {
      decribeProcessNode = evaluateXPathToFirstNode(
        `*/*:OperationsMetadata/*:Operation[@name="DescribeProcess"]/*:DCP/*:HTTP/*:Post`,
        doc,
        null,
        null,
        {
          language: evaluateXPath.XQUERY_3_1_LANGUAGE,
        },
      ) as Node;
      decribeProcessURL = (decribeProcessNode as any).attributes.getNamedItem(
        "xlink:href",
      ).value;

      decribeProcessMethod = "POST";
    }

    //if describe feature URLs are http, but the site is running on https,
    //we must try and upgrade the URL, otherwise it just won't work
    /*TODO - If we implement a local YARP proxy, use this*/
    if (document.location.protocol.startsWith("https")) {
      decribeProcessURL = decribeProcessURL.replace("http://", "https://");
    }

    const describeProcessCapability: Capability = {
      url: decribeProcessURL,
      type: CapabilityType.WPS_DescribeProcess,
      method: decribeProcessMethod,
    };

    const basicServerCapabilities: BasicServerCapabilities = {
      capabilities: [executeCapability, describeProcessCapability],
    };

    return basicServerCapabilities;
  } catch (error) {
    console.error(`Could not get capabilities doc: ${error}`);
  }
}

export async function hasWPSProcess(
  baseUrl: string,
  httpMethod: string,
  processName: string,
  proxyEndpoint: string = "",
  additionalUrlParams: object = {},
  httpHeaders: Headers = new Headers(),
): Promise<boolean> {
  const describeProcessURLParams = new URLSearchParams({
    service: "WPS",
    version: "1.1.0",
    request: "DescribeProcess",
    identifier: processName,
    ...additionalUrlParams,
  });
  const baseURLasURL = new URL(baseUrl);
  const baseURLParams = new URL(baseUrl).searchParams;
  const combinedURLParams = combineURLSearchParams(
    baseURLParams,
    describeProcessURLParams,
    true,
  );

  let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
  if (proxyEndpoint !== "") {
    fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
  }
  try {
    const response = await fetch(fetchUrl, {
      method: httpMethod,
      headers: httpHeaders,
    });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const describeProcessDoc = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(describeProcessDoc, "application/xml");

    const processName = (
      evaluateXPathToFirstNode(
        `*/*:ProcessDescription/*:Identifier`,
        doc,
        null,
        null,
        {
          language: evaluateXPath.XQUERY_3_1_LANGUAGE,
        },
      ) as Node
    ).textContent;

    if (processName) {
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Could not get process description: ${error}`);
  }
}

export function constructGetCapabilitiesURL(
  baseUrl: string,
  serviceType: ServiceType = ServiceType.WMS,
  version: string = "1.1.0",
  additionalUrlParams: object = {},
) {
  const getCapabilitiesURLParams = new URLSearchParams({
    service: ServiceType[serviceType],
    version: version,
    request: "GetCapabilities",
    ...additionalUrlParams,
  });
  const baseURLasURL = new URL(baseUrl);
  const baseURLParams = new URL(baseUrl).searchParams;
  const combinedURLParams = combineURLSearchParams(
    baseURLParams,
    getCapabilitiesURLParams,
    true,
  );

  const fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
  return fetchUrl;
}

