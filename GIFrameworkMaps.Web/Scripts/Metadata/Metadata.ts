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
import { Browser as BrowserUtil } from "../Util";
import { WfsEndpoint, WmsEndpoint, setFetchOptions as ogcClientSetFetchOptions } from "@camptocamp/ogc-client";
import { ServiceType } from "../Interfaces/WebLayerServiceDefinition";
export class Metadata {
  /*TODO - Make all the metadata fetchers use this generic function*/
  static async getCapabilities(
    baseUrl: string,
    serviceType: ServiceType = ServiceType.WMS,
    version: string = "1.1.0",
    proxyEndpoint: string = "",
    httpHeaders: Headers = new Headers(),
  ) {
    let fetchUrl = this.constructGetCapabilitiesURL(baseUrl, serviceType, version);
    if (proxyEndpoint !== "") {
      fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
    }
    const response = await fetch(fetchUrl, { headers: httpHeaders });
    return response;
  }

  static async getDescribeFeatureType(
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
    const combinedURLParams = BrowserUtil.combineURLSearchParams(
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
  static async getBasicCapabilities(
    baseUrl: string,
    additionalUrlParams: object = {},
    proxyEndpoint: string = "",
    httpHeaders: Headers = new Headers(),
  ): Promise<BasicServerCapabilities> {
    let fetchUrl = this.constructGetCapabilitiesURL(
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
   * Sends a WFS 1.1.0 GetCapabilities request to the baseUrl and returns
   * a list of styles allowed for that layer.
   * @param baseUrl - The base URL of the OGC server you want to query
   * @param layerName - The name of the layer to find in the list
   */
  static async getStylesForLayer(
    baseUrl: string,
    layerName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    proxyEndpoint: string = "",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    additionalUrlParams: object = {},
    httpHeaders: Headers = new Headers(),
  ) {

    ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });

    const endpoint = await new WmsEndpoint(baseUrl).isReady();
    const layer = endpoint.getLayerByName(layerName);
    return layer.styles;
    
  }

  static async getLayerMetadataFromCapabilities(
    baseUrl: string,
    layerName: string,
    type: ServiceType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    version: string = "1.1.0",
    proxyEndpoint: string = "",
    httpHeaders: Headers = new Headers()
  ) {
    ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
    if (type === ServiceType.WMS) {
      
      const endpoint = await new WmsEndpoint(baseUrl).isReady();
      const layer = endpoint.getLayerByName(layerName);
      const serviceInfo = endpoint.getServiceInfo();

      const bboxKey = Object.keys(layer.boundingBoxes).find(k => k === "EPSG:4326") || Object.keys(layer.boundingBoxes)[0];
      
      const layerResource: LayerResource = {
        name: layer.name,
        title: layer.title,
        abstract: layer.abstract,
        attribution: layer.attribution.title,
        formats: serviceInfo.outputFormats,
        baseUrl: baseUrl,
        projections: layer.availableCrs,
        extent: layer.boundingBoxes[bboxKey], //TODO
        queryable: true, //TODO - available in v1.1.1
        version: endpoint.getVersion(),
        proxyMetaRequests: proxyEndpoint !== "" ? true : false,
        proxyMapRequests: proxyEndpoint !== "" ? true : false,
        keywords: [],//TODO - Available in v1.1.1
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
        version: endpoint.getVersion(),
        proxyMetaRequests: proxyEndpoint !== "" ? true : false,
        proxyMapRequests: proxyEndpoint !== "" ? true : false,
        keywords: [],//TODO
      };
      return layerResource; 
    }
  }

  static async getLayersFromCapabilities(
    baseUrl: string,
    serviceType: ServiceType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    version: string = "1.1.0",
    proxyEndpoint: string = "",
    httpHeaders: Headers = new Headers(),
  ) {
    try {
      const availableLayers: LayerResource[] = [];

      ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
      if (serviceType === ServiceType.WMS) {
        const endpoint = await new WmsEndpoint(baseUrl).isReady();
        const serviceInfo = endpoint.getServiceInfo();
        const layers = endpoint.getLayers();
        layers.forEach(layer => {
          const layerDetails = endpoint.getLayerByName(layer.name);
          const bboxKey = Object.keys(layerDetails.boundingBoxes).find(k => k === "EPSG:4326") || Object.keys(layerDetails.boundingBoxes)[0];
          const layerResource: LayerResource = {
            name: layer.name,
            title: layer.title,
            abstract: layer.abstract,
            attribution: layerDetails.attribution.title,
            formats: serviceInfo.outputFormats,
            baseUrl: baseUrl,
            projections: layerDetails.availableCrs,
            extent: layerDetails.boundingBoxes[bboxKey], //TODO
            queryable: true,
            version: endpoint.getVersion(),
            proxyMetaRequests: proxyEndpoint !== "" ? true : false,
            proxyMapRequests: proxyEndpoint !== "" ? true : false,
            keywords: [],
          };
          availableLayers.push(layerResource);
        })
      } else {
        const endpoint = await new WfsEndpoint(baseUrl).isReady();
        const layers = endpoint.getFeatureTypes();
        const serviceInfo = endpoint.getServiceInfo();
        layers.forEach(async layer => {
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
            version: endpoint.getVersion(),
            proxyMetaRequests: proxyEndpoint !== "" ? true : false,
            proxyMapRequests: proxyEndpoint !== "" ? true : false,
            keywords: [],
          };
          availableLayers.push(layerResource);

        });
      }
      
      return availableLayers;
    } catch (error) {
      console.error(`Could not get capabilities doc: ${error}`);
    }
  }
  /**
   * Sends a WPS 1.1.0 GetCapabilities request to the baseUrl and returns
   * a stripped down set of basic capabilities.
   * @param baseUrl - The base URL of the OGC server you want to query
   */
  static async getWPSCapabilities(
    baseUrl: string,
    proxyEndpoint: string = "",
    additionalUrlParams: object = {},
    httpHeaders: Headers = new Headers(),
  ): Promise<BasicServerCapabilities> {
    let fetchUrl = this.constructGetCapabilitiesURL(
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

  static async hasWPSProcess(
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
    const combinedURLParams = BrowserUtil.combineURLSearchParams(
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

  static constructGetCapabilitiesURL(
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
    const combinedURLParams = BrowserUtil.combineURLSearchParams(
      baseURLParams,
      getCapabilitiesURLParams,
      true,
    );

    const fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
    return fetchUrl;
  }
}
