import { BasicServerCapabilities, Capability, CapabilityType } from "../Interfaces/OGCMetadata/BasicServerCapabilities";
import { DescribeFeatureType } from "../Interfaces/OGCMetadata/DescribeFeatureType";
import { evaluateXPath, evaluateXPathToFirstNode, evaluateXPathToNodes } from "fontoxpath";
import { Style } from "../Interfaces/OGCMetadata/Style";
import { LayerResource } from "../Interfaces/OGCMetadata/LayerResource";
import { Util } from "../Util";
import * as olExtent from "ol/extent";
export class Metadata {

    /*TODO - Make all the metadata fetchers use this generic function*/
    static async getCapabilities(baseUrl: string, service: string = "WMS", version: string = "1.1.0", proxyEndpoint: string = "") {
        let getCapabilitiesURLParams = new URLSearchParams({
            service: service,
            version: version,
            request: 'GetCapabilities'
        });
        let baseURLasURL = new URL(baseUrl)
        let baseURLParams = new URL(baseUrl).searchParams;
        let combinedURLParams = Util.Browser.combineURLSearchParams(baseURLParams, getCapabilitiesURLParams, true);

        let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
        if (proxyEndpoint !== "") {
            fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
        }
        let response = await fetch(fetchUrl);
        return response;

    }

    static async getDescribeFeatureType(baseUrl: string, featureTypeName: string, httpMethod: string, outputFormat: string = 'application/json', proxyEndpoint:string = "", additionalUrlParams: {} = {}): Promise<DescribeFeatureType> {
        
        let describeFeatureURLParams = new URLSearchParams({
            service: 'WFS',
            version: '1.1.0',
            request: 'DescribeFeatureType',
            typeName: featureTypeName,
            outputFormat: outputFormat,
            ...additionalUrlParams
        })

        let baseURLasURL = new URL(baseUrl)
        let baseURLParams = baseURLasURL.searchParams;
        let combinedURLParams = Util.Browser.combineURLSearchParams(baseURLParams, describeFeatureURLParams, true);
        let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
        if (proxyEndpoint !== "") {
            fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
        }

        try {
            let response = await fetch(fetchUrl,
                { method: httpMethod }
            );
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            let json: DescribeFeatureType = await response.json();
            return json;
        }
        catch (error) {
            console.error(`Could not get feature description: ${error}`);
        }

    }

    /**
     * Sends a WFS 1.1.0 GetCapabilities request to the baseUrl and returns 
     * a stripped down set of basic capabilities.
     * @param baseUrl - The base URL of the OGC server you want to query
     */
    static async getBasicCapabilities(baseUrl: string, additionalUrlParams: {} = {}, proxyEndpoint: string = ""): Promise<BasicServerCapabilities> {
        let getCapabilitiesURLParams = new URLSearchParams({
            service: 'WFS',
            version: '1.1.0',
            request: 'GetCapabilities',
            ...additionalUrlParams
        });
        let baseURLasURL = new URL(baseUrl)
        let baseURLParams = new URL(baseUrl).searchParams;
        let combinedURLParams = Util.Browser.combineURLSearchParams(baseURLParams, getCapabilitiesURLParams, true);

        let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
        if (proxyEndpoint !== "") {
            fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
        }
        try {
            let response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            /*TODO - Make this use jsonix and the ogc-schemas libraries to more effectively and robustly parse the response*/
            let capabilitiesDoc = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(capabilitiesDoc, "application/xml");

            let describeFeatureTypeNode = (evaluateXPathToFirstNode(`*/*:OperationsMetadata/*:Operation[@name="DescribeFeatureType"]/*:DCP/*:HTTP/*:Get`, doc, null, null, {
                language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            }) as Node);
            let describeFeatureTypeURL = (describeFeatureTypeNode as any).attributes.getNamedItem("xlink:href").value;

            let describeFeatureMethod: string = "GET";
            if (!describeFeatureTypeURL) {
                describeFeatureTypeNode = (evaluateXPathToFirstNode(`*/*:OperationsMetadata/*:Operation[@name="DescribeFeatureType"]/*:DCP/*:HTTP/*:Post`, doc, null, null, {
                    language: evaluateXPath.XQUERY_3_1_LANGUAGE,
                }) as Node);
                describeFeatureTypeURL = (describeFeatureTypeNode as any).attributes.getNamedItem("xlink:href").value;
                describeFeatureMethod = "POST";
            }

            //if describe feature URLs are http, but the site is running on https,
            //we must try and upgrade the URL, otherwise it just won't work
            if (document.location.protocol.startsWith('https')) {
                describeFeatureTypeURL = describeFeatureTypeURL.replace("http://", "https://")
            }

            let describeFeatureTypeCapability: Capability = {
                url:describeFeatureTypeURL,
                type: CapabilityType.DescribeFeatureType,
                method:describeFeatureMethod
            };

            let getFeatureNode = (evaluateXPathToFirstNode(`*/*:OperationsMetadata/*:Operation[@name="GetFeature"]/*:DCP/*:HTTP/*:Post`, doc, null, null, {
                language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            }) as Node);
            let getFeatureURL = (getFeatureNode as any).attributes.getNamedItem("xlink:href").value;

            let getFeatureMethod = "POST";
            if (!getFeatureURL) {
                getFeatureNode = (evaluateXPathToFirstNode(`*/*:OperationsMetadata/*:Operation[@name="GetFeature"]/*:DCP/*:HTTP/*:Get`, doc, null, null, {
                    language: evaluateXPath.XQUERY_3_1_LANGUAGE,
                }) as Node);
                getFeatureURL = (getFeatureNode as any).attributes.getNamedItem("xlink:href").value;
                getFeatureMethod = "GET";
            }

            //if feature URLs are http, but the site is running on https,
            //we must try and upgrade the URL, otherwise it just won't work
            if (document.location.protocol.startsWith('https')) {
                getFeatureURL = getFeatureURL.replace("http://", "https://")
            }
            let getFeatureCapability: Capability = {
                url: getFeatureURL,
                type: CapabilityType.WFS_GetFeature,
                method: getFeatureMethod
            };

            let basicServerCapabilities: BasicServerCapabilities = {
                capabilities: [describeFeatureTypeCapability, getFeatureCapability]
            }

            return basicServerCapabilities;
        }
        catch (error) {
            console.error(`Could not get capabilities doc: ${error}`);
        }

    }

    /**
     * Sends a WFS 1.1.0 GetCapabilities request to the baseUrl and returns 
     * a list of styles allowed for that layer.
     * @param baseUrl - The base URL of the OGC server you want to query
     * @param layerName - The name of the layer to find in the list
     */
    static async getStylesForLayer(baseUrl: string, layerName: string, proxyEndpoint: string = "", additionalUrlParams: {} = {}): Promise<Style[]> {
        let getCapabilitiesURLParams = new URLSearchParams({
            service: 'WMS',
            version: '1.1.0',
            request: 'GetCapabilities',
            ...additionalUrlParams
        });
        let baseURLasURL = new URL(baseUrl)
        let baseURLParams = new URL(baseUrl).searchParams;
        let combinedURLParams = Util.Browser.combineURLSearchParams(baseURLParams, getCapabilitiesURLParams, true);

        let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
        if (proxyEndpoint !== "") {
            fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
        }

        try {
            let response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            /*TODO - Make this use jsonix and the ogc-schemas libraries to more effectively and robustly parse the response*/
            let capabilitiesDoc = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(capabilitiesDoc, "application/xml");
            
            let styles = (evaluateXPathToNodes(`//Layer[Name='${layerName}']/Style`, doc, null, null, { language: evaluateXPath.XQUERY_3_1_LANGUAGE }) as Node[]);

            //parse styles into list of styles
            let availableStyles: Style[] = [];
            styles.forEach(s => {
                
                let title, name, abstract: string;
                s.childNodes.forEach(n => {
                    if (n.nodeName === 'Title') {
                        title = n.textContent;
                    }
                    if (n.nodeName === 'Name') {
                        name = n.textContent;
                    }
                    if (n.nodeName === 'Abstract') {
                        abstract = n.textContent;
                    }
                })
                let style: Style = {
                    name: name,
                    title: title,
                    abstract: abstract
                }
                availableStyles.push(style)
            })
            return availableStyles;
        }
        catch (error) {
            console.error(`Could not get capabilities doc: ${error}`);
        }
    }

    static async getLayersFromCapabilities(baseUrl: string, version:string = "1.1.0", proxyEndpoint:string = "") {
        try {
            //does the baseurl already contain a version? If so, use that.
            let response = await this.getCapabilities(baseUrl, "WMS", version, proxyEndpoint);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            /*TODO - Make this use jsonix and the ogc-schemas libraries to more effectively and robustly parse the response*/
            let capabilitiesDoc = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(capabilitiesDoc, "application/xml");

            //get the GetMap endpoint (TODO - this is gross)
            let getMapEndpointNode = (evaluateXPathToFirstNode(`//GetMap/DCPType/HTTP/Get/OnlineResource`, doc, null, null, {
                language: evaluateXPath.XQUERY_3_1_LANGUAGE
            }) as Node);
            let getMapEndpoint = (getMapEndpointNode as any).attributes.getNamedItem("xlink:href").value;

            let formatNodes = (evaluateXPathToNodes(`//GetMap/Format`, doc, null, null, { language: evaluateXPath.XQUERY_3_1_LANGUAGE }) as Node[]);
            let formats = formatNodes.map(f => f.textContent);
            const preferredFormats = ["image/png", "image/png8", "image/jpeg"];
            let acceptableFormats = preferredFormats.filter(f => formats.includes(f))

            let projectionXPath = '//Capability/Layer/SRS';
            if (version === "1.3.0") {
                projectionXPath = '//Capability/Layer/CRS';
            }
            let projectionNodes = (evaluateXPathToNodes(projectionXPath, doc, null, null, { language: evaluateXPath.XQUERY_3_1_LANGUAGE }) as Node[]);
            let projections = projectionNodes.map(f => f.textContent.split(" ")).flat();
            const preferredProjections = ["EPSG:3857","EPSG:27700","EPSG:4326","EPSG:900913", "CRS:84"]
            let projection = preferredProjections.find(p => projections.includes(p));
            if (!projection) {
                projection = projections[0];
            }
            let layers = (evaluateXPathToNodes(`//Layer/Layer`, doc, null, null, { language: evaluateXPath.XQUERY_3_1_LANGUAGE }) as Node[]);
            //parse styles into list of styles
            let availableLayers: LayerResource[] = [];
            layers.forEach(s => {
                let title: string, name: string, abstract: string, attribution: string, attributionUrl: string, queryable: boolean = false;
                let extent: olExtent.Extent;
                if ((s as any).attributes.getNamedItem("queryable")?.value === "1") {
                    queryable = true;
                }
                /*TODO - This is gross and inefficient. Make it better*/
                s.childNodes.forEach(n => {
                    if (n.nodeName === 'Name') {
                        name = n.textContent;
                    }
                    if (n.nodeName === 'Title') {
                        title = n.textContent;
                    }
                    if (n.nodeName === 'Abstract') {
                        abstract = n.textContent;
                    }
                    if (n.nodeName === 'Attribution') {
                        n.childNodes.forEach(c => {
                            if (c.nodeName === 'Title') {
                                attribution = c.textContent.replace("{{CURRENT_YEAR}}",new Date().getFullYear().toString());
                            }
                            if (c.nodeName === 'OnlineResource') {
                                attributionUrl = (c as any).attributes.getNamedItem("xlink:href")?.value;
                            }
                        })
                        if (attribution && attributionUrl) {
                            attribution = `<a href="${attributionUrl}" target="_blank">${attribution}</a>`;
                        }
                    }
                    if (n.nodeName === `${version === "1.3.0" ? 'EX_GeographicBoundingBox' : 'LatLonBoundingBox'}`) {
                        if (version === "1.3.0") {
                            extent =
                                [
                                    parseFloat((n as any).getElementsByTagName('westBoundLongitude')[0].textContent),
                                    parseFloat((n as any).getElementsByTagName('southBoundLatitude')[0].textContent),
                                    parseFloat((n as any).getElementsByTagName('eastBoundLongitude')[0].textContent),
                                    parseFloat((n as any).getElementsByTagName('northBoundLatitude')[0].textContent),
                                ]
                        } else {
                            extent =
                                [
                                    parseFloat((n as any).attributes.getNamedItem("minx").value),
                                    parseFloat((n as any).attributes.getNamedItem("miny").value),
                                    parseFloat((n as any).attributes.getNamedItem("maxx").value),
                                    parseFloat((n as any).attributes.getNamedItem("maxy").value)
                                ]
                        }
                    }
                })
                
                let layer: LayerResource = {
                    name: name,
                    title: title,
                    abstract: abstract,
                    attribution: attribution,
                    formats: acceptableFormats,
                    baseUrl: getMapEndpoint,
                    projection: projection,
                    extent: extent,
                    queryable: queryable
                }
                availableLayers.push(layer)
            })
            return availableLayers;
        }
        catch (error) {
            console.error(`Could not get capabilities doc: ${error}`);
        }
    }
    /**
     * Sends a WPS 1.1.0 GetCapabilities request to the baseUrl and returns 
     * a stripped down set of basic capabilities.
     * @param baseUrl - The base URL of the OGC server you want to query
     */
    static async getWPSCapabilities(baseUrl: string, proxyEndpoint: string = "", additionalUrlParams: {} = {}): Promise<BasicServerCapabilities> {
        let getCapabilitiesURLParams = new URLSearchParams({
            service: 'wps',
            version: '1.1.0',
            request: 'GetCapabilities',
            ...additionalUrlParams
        });
        let baseURLasURL = new URL(baseUrl)
        let baseURLParams = new URL(baseUrl).searchParams;
        let combinedURLParams = Util.Browser.combineURLSearchParams(baseURLParams, getCapabilitiesURLParams, true);

        let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
        if (proxyEndpoint !== "") {
            fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
        }
        try {
            let response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            /*TODO - Make this use jsonix and the ogc-schemas libraries to more effectively and robustly parse the response*/
            let capabilitiesDoc = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(capabilitiesDoc, "application/xml");

            let executeURLNode = (evaluateXPathToFirstNode(`*/*:OperationsMetadata/*:Operation[@name="Execute"]/*:DCP/*:HTTP/*:Post`, doc, null, null, {
                language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            }) as Node);
            let executeURL = (executeURLNode as any).attributes.getNamedItem("xlink:href").value;
            let executeMethod: string = "POST";

            //if describe feature URLs are http, but the site is running on https,
            //we must try and upgrade the URL, otherwise it just won't work
            /*TODO - If we implement a local YARP proxy, use this*/
            if (document.location.protocol.startsWith('https')) {
                executeURL = executeURL.replace("http://", "https://")
            }

            let executeCapability: Capability = {
                url: executeURL,
                type: CapabilityType.WPS_Execute,
                method: executeMethod
            };

            let decribeProcessNode = (evaluateXPathToFirstNode(`*/*:OperationsMetadata/*:Operation[@name="DescribeProcess"]/*:DCP/*:HTTP/*:Get`, doc, null, null, {
                language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            }) as Node);
            let decribeProcessURL = (decribeProcessNode as any).attributes.getNamedItem("xlink:href").value;
            let decribeProcessMethod: string = "GET";
            if (!decribeProcessURL) {
                decribeProcessNode = (evaluateXPathToFirstNode(`*/*:OperationsMetadata/*:Operation[@name="DescribeProcess"]/*:DCP/*:HTTP/*:Post`, doc, null, null, {
                    language: evaluateXPath.XQUERY_3_1_LANGUAGE,
                }) as Node);
                decribeProcessURL = (decribeProcessNode as any).attributes.getNamedItem("xlink:href").value;

                decribeProcessMethod = "POST";
            }

            //if describe feature URLs are http, but the site is running on https,
            //we must try and upgrade the URL, otherwise it just won't work
            /*TODO - If we implement a local YARP proxy, use this*/
            if (document.location.protocol.startsWith('https')) {
                decribeProcessURL = decribeProcessURL.replace("http://", "https://")
            }

            let describeProcessCapability: Capability = {
                url: decribeProcessURL,
                type: CapabilityType.WPS_DescribeProcess,
                method: decribeProcessMethod
            };
            

            let basicServerCapabilities: BasicServerCapabilities = {
                capabilities: [executeCapability, describeProcessCapability]
            }

            return basicServerCapabilities;
        }
        catch (error) {
            console.error(`Could not get capabilities doc: ${error}`);
        }

    }

    static async hasWPSProcess(baseUrl: string, httpMethod: string, processName: string, proxyEndpoint: string = "", additionalUrlParams: {} = {}): Promise<boolean> {
        let describeProcessURLParams = new URLSearchParams({
            service: 'WPS',
            version: '1.1.0',
            request: 'DescribeProcess',
            identifier: processName,
            ...additionalUrlParams
        })
        let baseURLasURL = new URL(baseUrl)
        let baseURLParams = new URL(baseUrl).searchParams;
        let combinedURLParams = Util.Browser.combineURLSearchParams(baseURLParams, describeProcessURLParams, true);

        let fetchUrl = `${baseURLasURL.origin}${baseURLasURL.pathname}?${combinedURLParams}`;
        if (proxyEndpoint !== "") {
            fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
        }
        try {
            let response = await fetch(fetchUrl,
                { method: httpMethod }
            );
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            let describeProcessDoc = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(describeProcessDoc, "application/xml");

            let processName = (evaluateXPathToFirstNode(`*/*:ProcessDescription/*:Identifier`, doc, null, null, {
                language: evaluateXPath.XQUERY_3_1_LANGUAGE,
            }) as Node).textContent;

            if (processName) {
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`Could not get process description: ${error}`);
        }
    }
}