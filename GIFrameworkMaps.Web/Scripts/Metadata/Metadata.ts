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
  evaluateXPathToNodes,
} from "fontoxpath";
import { Style } from "../Interfaces/OGCMetadata/Style";
import { LayerResource } from "../Interfaces/OGCMetadata/LayerResource";
import { Browser as BrowserUtil } from "../Util";
import * as olExtent from "ol/extent";
import { WfsEndpoint, WmsEndpoint, setFetchOptions as ogcClientSetFetchOptions } from "@camptocamp/ogc-client";
export class Metadata {
  /*TODO - Make all the metadata fetchers use this generic function*/
  static async getCapabilities(
    baseUrl: string,
    service: string = "WMS",
    version: string = "1.1.0",
    proxyEndpoint: string = "",
    httpHeaders: Headers = new Headers(),
  ) {
    let fetchUrl = this.constructGetCapabilitiesURL(baseUrl, service, version);
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
      "WFS",
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
    proxyEndpoint: string = "",
    additionalUrlParams: object = {},
    httpHeaders: Headers = new Headers(),
  ): Promise<Style[]> {
    let fetchUrl = this.constructGetCapabilitiesURL(
      baseUrl,
      "WMS",
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

      const styles = evaluateXPathToNodes(
        `//Layer[Name='${layerName}']/Style`,
        doc,
        null,
        null,
        { language: evaluateXPath.XQUERY_3_1_LANGUAGE },
      ) as Node[];

      //parse styles into list of styles
      const availableStyles: Style[] = [];
      styles.forEach((s) => {
        let title, name, abstract: string;
        s.childNodes.forEach((n) => {
          if (n.nodeName === "Title") {
            title = n.textContent;
          }
          if (n.nodeName === "Name") {
            name = n.textContent;
          }
          if (n.nodeName === "Abstract") {
            abstract = n.textContent;
          }
        });
        const style: Style = {
          name: name,
          title: title,
          abstract: abstract,
        };
        availableStyles.push(style);
      });
      return availableStyles;
    } catch (error) {
      console.error(`Could not get capabilities doc: ${error}`);
    }
  }

  static async getLayerMetadataFromCapabilities(
    baseUrl: string,
    layerName: string,
    type: 'wms' | 'wfs',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    version: string = "1.1.0",
    proxyEndpoint: string = "",
    httpHeaders: Headers = new Headers(),
  ) {
    ogcClientSetFetchOptions({ headers: Object.fromEntries(httpHeaders) });
    if (type === 'wms') {
      
      const endpoint = await new WmsEndpoint(baseUrl).isReady();
      const layer = endpoint.getLayerByName(layerName);
      const serviceInfo = endpoint.getServiceInfo();

      console.warn((Object.keys(layer.boundingBoxes) as Array<string>).find(key => layer.boundingBoxes[key]));

      const layerResource: LayerResource = {
        name: layer.name,
        title: layer.title,
        abstract: layer.abstract,
        attribution: layer.attribution.title,
        formats: serviceInfo.outputFormats,
        baseUrl: baseUrl,
        projections: layer.availableCrs,
        extent: [], //TODO
        queryable: true, //TODO
        version: endpoint.getVersion(),
        proxyMetaRequests: proxyEndpoint !== "" ? true : false,
        proxyMapRequests: proxyEndpoint !== "" ? true : false,
        keywords: null,//TODO
      };
      return layerResource;
    } else {
      const endpoint = await new WfsEndpoint(baseUrl).isReady();
      const layer = await endpoint.getFeatureTypeFull(layerName);
      const serviceInfo = endpoint.getServiceInfo();
      const layerResource: LayerResource = {
        name: layer.name,
        title: layer.title,
        abstract: layer.abstract,
        attribution: "", //TODO
        formats: serviceInfo.outputFormats,
        baseUrl: baseUrl,
        projections: layer.otherCrs,
        extent: layer.boundingBox,
        queryable: true,//TODO
        version: endpoint.getVersion(),
        proxyMetaRequests: proxyEndpoint !== "" ? true : false,
        proxyMapRequests: proxyEndpoint !== "" ? true : false,
        keywords: null,//TODO
      };
      return layerResource;
      
      
    }
  }

  static async getLayersFromCapabilities(
    baseUrl: string,
    version: string = "1.1.0",
    proxyEndpoint: string = "",
    httpHeaders: Headers = new Headers(),
  ) {
    try {
      //does the baseurl already contain a version? If so, use that.
      const response = await this.getCapabilities(
        baseUrl,
        "WMS",
        version,
        proxyEndpoint,
        httpHeaders,
      );
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      /*TODO - Make this use jsonix and the ogc-schemas libraries to more effectively and robustly parse the response*/
      const capabilitiesDoc = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(capabilitiesDoc, "application/xml");

      //get the GetMap endpoint (TODO - this is gross)
      const getMapEndpointNode = evaluateXPathToFirstNode(
        `//GetMap/DCPType/HTTP/Get/OnlineResource`,
        doc,
        null,
        null,
        {
          language: evaluateXPath.XQUERY_3_1_LANGUAGE,
        },
      ) as Node;
      const getMapEndpoint = (
        getMapEndpointNode as any
      ).attributes.getNamedItem("xlink:href").value;

      const formatNodes = evaluateXPathToNodes(
        `//GetMap/Format`,
        doc,
        null,
        null,
        { language: evaluateXPath.XQUERY_3_1_LANGUAGE },
      ) as Node[];
      const formats = formatNodes.map((f) => f.textContent);
      const preferredFormats = ["image/png", "image/png8", "image/jpeg"];
      const acceptableFormats = preferredFormats.filter((f) =>
        formats.includes(f),
      );

      let projectionXPath = "//Capability/Layer/SRS";
      if (version === "1.3.0") {
        projectionXPath = "//Capability/Layer/CRS";
      }
      const projectionNodes = evaluateXPathToNodes(
        projectionXPath,
        doc,
        null,
        null,
        { language: evaluateXPath.XQUERY_3_1_LANGUAGE },
      ) as Node[];
      const projections = projectionNodes
        .map((f) => f.textContent.split(" "))
        .flat();
      const layers = evaluateXPathToNodes(`//Layer/Layer`, doc, null, null, {
        language: evaluateXPath.XQUERY_3_1_LANGUAGE,
      }) as Node[];
      //parse styles into list of styles
      const availableLayers: LayerResource[] = [];
      layers.forEach((s) => {
        let title: string,
          name: string,
          abstract: string,
          attribution: string,
          attributionUrl: string,
          queryable: boolean = false;
        const keywords: string[] = [];
        let extent: olExtent.Extent;
        if ((s as any).attributes.getNamedItem("queryable")?.value === "1") {
          queryable = true;
        }
        /*TODO - This is gross and inefficient. Make it better*/
        s.childNodes.forEach((n) => {
          if (n.nodeName === "Name") {
            name = n.textContent;
          }
          if (n.nodeName === "Title") {
            title = n.textContent;
          }
          if (n.nodeName === "Abstract") {
            abstract = n.textContent;
          }
          if (n.nodeName === "Attribution") {
            n.childNodes.forEach((c) => {
              if (c.nodeName === "Title") {
                attribution = c.textContent.replaceAll(
                  "{{CURRENT_YEAR}}",
                  new Date().getFullYear().toString(),
                );
              }
              if (c.nodeName === "OnlineResource") {
                attributionUrl = (c as any).attributes.getNamedItem(
                  "xlink:href",
                )?.value;
              }
            });
            if (attribution && attributionUrl) {
              attribution = `<a href="${attributionUrl}" target="_blank">${attribution}</a>`;
            }
          }
          if (
            n.nodeName ===
            `${
              version === "1.3.0"
                ? "EX_GeographicBoundingBox"
                : "LatLonBoundingBox"
            }`
          ) {
            if (version === "1.3.0") {
              extent = [
                parseFloat(
                  (n as any).getElementsByTagName("westBoundLongitude")[0]
                    .textContent,
                ),
                parseFloat(
                  (n as any).getElementsByTagName("southBoundLatitude")[0]
                    .textContent,
                ),
                parseFloat(
                  (n as any).getElementsByTagName("eastBoundLongitude")[0]
                    .textContent,
                ),
                parseFloat(
                  (n as any).getElementsByTagName("northBoundLatitude")[0]
                    .textContent,
                ),
              ];
            } else {
              extent = [
                parseFloat((n as any).attributes.getNamedItem("minx").value),
                parseFloat((n as any).attributes.getNamedItem("miny").value),
                parseFloat((n as any).attributes.getNamedItem("maxx").value),
                parseFloat((n as any).attributes.getNamedItem("maxy").value),
              ];
            }
          }
          if (n.nodeName === "KeywordList") {
            n.childNodes.forEach((c) => {
              if (c.nodeName === "Keyword") {
                keywords.push(c.textContent);
              }
            });
          }
        });

        const layer: LayerResource = {
          name: name,
          title: title,
          abstract: abstract,
          attribution: attribution,
          formats: acceptableFormats,
          baseUrl: getMapEndpoint,
          projections: projections,
          extent: extent,
          queryable: queryable,
          version: version,
          proxyMetaRequests: proxyEndpoint !== "" ? true : false,
          proxyMapRequests: proxyEndpoint !== "" ? true : false,
          keywords: keywords,
        };
        availableLayers.push(layer);
      });
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
      "wps",
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
    service: string = "WMS",
    version: string = "1.1.0",
    additionalUrlParams: object = {},
  ) {
    const getCapabilitiesURLParams = new URLSearchParams({
      service: service,
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
