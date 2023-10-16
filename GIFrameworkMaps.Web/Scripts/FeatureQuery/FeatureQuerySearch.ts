import Buffer from "@turf/buffer";
import { point as turfPoint, Units as turfUnits } from "@turf/helpers";
import intersect from "@turf/intersect";
import lineIntersect from "@turf/line-intersect";
import pointsWithinPolygon from "@turf/points-within-polygon";
import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { never as olConditionNever } from "ol/events/condition";
import { GeoJSON, WFS, WMSGetFeatureInfo } from "ol/format";
import { intersects as intersectsFilter, equalTo as equalToFilter, and as andFilter, between as betweenFilter } from 'ol/format/filter';
import Filter from "ol/format/filter/Filter";
import GML3 from "ol/format/GML3";
import { Geometry, Point as olPoint, Polygon as olPolygon } from "ol/geom";
import Draw, { DrawEvent } from "ol/interaction/Draw";
import { Layer } from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import RenderFeature from "ol/render/Feature";
import { ImageWMS, TileWMS, Vector } from "ol/source";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Text } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { FeatureQueryRequest } from "../Interfaces/FeatureQuery/FeatureQueryRequest";
import { FeatureQueryResponse } from "../Interfaces/FeatureQuery/FeatureQueryResponse";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { CapabilityType } from "../Interfaces/OGCMetadata/BasicServerCapabilities";
import { DescribeFeatureType } from "../Interfaces/OGCMetadata/DescribeFeatureType";
import { GIFWMap } from "../Map";
import { Metadata } from "../Metadata/Metadata";
import CQL from "../OL Extensions/CQL";
import { GIFWPopupAction } from "../Popups/PopupAction";
import { GIFWPopupOptions } from "../Popups/PopupOptions";
import { Util } from "../Util";
import { FeatureQueryResultRenderer } from "./FeatureQueryResultRenderer";

export class FeatureQuerySearch {
    _gifwMapInstance: GIFWMap;
    _maxTimeout: number = 10000;
    _searchResultRenderer: FeatureQueryResultRenderer;
    _drawControl: Draw;
    _basicStyle: Style;
    _tipStyle: Style;
    _tipPoint: Geometry;
    _queryLayer: VectorLayer<any>;
    _vectorSource: VectorSource<any>;
    _keyboardEventAbortController: AbortController;

    constructor(gifwMapInstance: GIFWMap) {
        this._gifwMapInstance = gifwMapInstance;
        this._searchResultRenderer = new FeatureQueryResultRenderer(gifwMapInstance);
        this._vectorSource = new VectorSource();
        this._basicStyle = this.getBasicStyle();
        this._tipStyle = this.getTipStyle();

        this._queryLayer = gifwMapInstance.addNativeLayerToMap(this._vectorSource, "Query Polygons", (feature: Feature<any>) => {
            return this.getStyleForQueryFeature(feature);
        }, false, LayerGroupType.SystemNative);
    }

    public doInfoSearch(searchCoord: number[], searchPixel: number[]) {
        let searchGeom = new olPoint(searchCoord);
        let searchableLayers = this.getSearchableLayers(searchGeom);
        if (searchableLayers.length !== 0) {

            let searchPromises: Promise<FeatureQueryResponse>[] = [];
            let layerNames: string[] = [];
            searchableLayers.forEach(layer => {
                let source = layer.getSource();
                if (source instanceof TileWMS || source instanceof ImageWMS) {

                    let featureInfoURL = source.getFeatureInfoUrl(
                        searchCoord,
                        this._gifwMapInstance.olMap.getView().getResolution(),
                        this._gifwMapInstance.olMap.getView().getProjection(),
                        {
                            'INFO_FORMAT': 'application/vnd.ogc.gml',
                            'FEATURE_COUNT': 100
                        }
                    )
                    let request: FeatureQueryRequest = { layer: layer, searchUrl: featureInfoURL };
                    searchPromises.push(this.getFeatureInfoForLayer(request));
                    layerNames.push(layer.get("name"));
                } else if (source instanceof Vector) {

                    let features = new Set<Feature<Geometry> | RenderFeature>();
                    this._gifwMapInstance.olMap.getFeaturesAtPixel(searchPixel, { layerFilter: (l) => { return l === layer } }).forEach((f) => {
                        features.add(f);
                    });
                    // Add features at the search coordinates that may not be visible at the search pixel, e.g. features with a fill opacity of zero
                    source.getFeaturesAtCoordinate(searchCoord).forEach((f) => {
                        features.add(f);
                    });

                    layerNames.push(layer.get("name"));

                    let promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
                        let infoClickResponse: FeatureQueryResponse = {
                            features: Array.from(features),
                            layer: layer
                        }
                        resolve(infoClickResponse)
                    });
                    searchPromises.push(promise);


                }

            })

            this._searchResultRenderer.showLoadingPopup(layerNames, searchCoord);
            Promise.allSettled(searchPromises).then((promises) => {
                this.resolveSearchPromises(promises, searchCoord);
            });

        }
    }

    public async doAreaInfoSearch(searchPolygon: olPolygon) {
        let searchableLayers = this.getSearchableLayers(searchPolygon);
        if (searchableLayers.length !== 0) {

            let layerNames: string[] = [];
            searchableLayers.forEach(l => {
                layerNames.push(l.get('name'));
            })
            let coordLen = searchPolygon.getCoordinates()[0].length;

            let popupCoord = searchPolygon.getCoordinates()[0][coordLen - 2];
            this._searchResultRenderer.showLoadingPopup(layerNames, popupCoord);
            let searchPromises = await this.getSearchPromisesForLayers(searchableLayers, searchPolygon);

            Promise.allSettled(searchPromises).then((promises) => {
                this.resolveSearchPromises(promises, popupCoord);
            });


        }
    }

    private resolveSearchPromises(promises: PromiseSettledResult<FeatureQueryResponse>[], popupCoord: Coordinate) {
        let completedPromises = promises.filter(p => p.status === 'fulfilled') as PromiseFulfilledResult<FeatureQueryResponse>[];
        let responsesWithData: FeatureQueryResponse[] = [];
        completedPromises.forEach(p => {
            let response = p.value;
            if (response.features.length !== 0) {
                responsesWithData.push(response);
            }
        })

        if (responsesWithData.length !== 0) {
            let numLayers = responsesWithData.length;
            let hasFeatures = responsesWithData.some(r => r.features.length > 0);
            if (hasFeatures) {
                if (numLayers === 1 && responsesWithData[0].features.length === 1) {
                    this._searchResultRenderer.showFeaturePopup(popupCoord, responsesWithData[0].layer, responsesWithData[0].features[0]);
                } else {
                    this._searchResultRenderer.showFeatureArrayPopup(popupCoord, responsesWithData);
                }
            } else {
                this._searchResultRenderer.showNoFeaturesPopup(popupCoord);
            }

        } else {
            this._searchResultRenderer.showNoFeaturesPopup(popupCoord);
        }

        let failedPromises = promises.filter(p => p.status !== 'fulfilled');

        if (failedPromises.length !== 0) {
            let msgs: string[] = [];
            failedPromises.forEach(failedPromise => {
                console.error(failedPromise.status);
                msgs.push(failedPromise.status);
            })
            let err = new Util.Error(
                responsesWithData.length === 0 ? Util.AlertType.Popup : Util.AlertType.Toast,
                Util.AlertSeverity.Danger,
                `Feature request failed`,
                `${msgs.length} layer${msgs.length !== 1 ? "s" : ""} had a problem when returning feature information`);
            err.show();
        }
    }

    public doBufferSearch(searchCoord: number[], searchPixel: number[]) {


        let popup = this._gifwMapInstance.popupOverlay.overlay.getElement();

        let queryForm = `<div class="mb-3">
                                <label for="infoBufferRadius" class="form-label">Buffer</label>
                                <div class="row g-0">
                                    <div class="col-6">
                                        <input type="number" class="form-control form-control-sm" id="infoBufferRadius">
                                    </div>
                                    <div class="col-4">
                                        <select id="infoBufferRadiusUnit" class="form-select form-select-sm ms-2">
                                            <option id="meters">metres</option>
                                            <option id="kilometers">kilometres</option>
                                            <option id="miles">miles</option>
                                        </select>
                                    </div>
                            </div>`

        let outerForm = document.createElement('form');
        outerForm.innerHTML = queryForm;

        let submitButton = document.createElement('button');
        submitButton.innerText = 'Search';
        submitButton.className = 'btn btn-outline-primary btn-sm';
        submitButton.type = 'submit';
        outerForm.appendChild(submitButton);

        let cancelButton = document.createElement('button');
        cancelButton.innerText = 'Cancel';
        cancelButton.className = 'btn btn-text btn-sm ms-2';
        cancelButton.type = 'button';
        outerForm.appendChild(cancelButton);

        popup.querySelector('#gifw-popup-content').innerHTML = '<h1>Buffer search</h1><p>Enter a size for your buffer and hit search.</p>';
        popup.querySelector('#gifw-popup-content').appendChild(outerForm);
        outerForm.addEventListener('submit', e => {
            e.preventDefault();
            if (outerForm.checkValidity()) {
                this._gifwMapInstance.popupOverlay.overlay.un('change:position', () => this.activatePointSearch());
                //create the geometry
                let formatter = new GeoJSON({
                    dataProjection: 'EPSG:4326'
                });
                let radius = (outerForm.querySelector('input[type=number]') as HTMLInputElement).valueAsNumber;
                let units = (outerForm.querySelector('select') as HTMLSelectElement).value;
                let turfUnit = units as turfUnits;

                //submit to the area query searcher
                let featureGeom = new olPoint(searchCoord);
                featureGeom.transform(this._gifwMapInstance.olMap.getView().getProjection(), 'EPSG:4326');

                let point = turfPoint(featureGeom.getCoordinates());
                let buffer = Buffer(point, radius, { units: turfUnit });

                let bufferedFeature = formatter.readFeature(buffer) as Feature<olPolygon>;
                let bufferedGeometry = bufferedFeature.getGeometry();
                bufferedGeometry.transform('EPSG:4326', this._gifwMapInstance.olMap.getView().getProjection());
                let feature = new Feature(bufferedGeometry);
                this.addAreaQueryInfoToPopup(feature);
                this._vectorSource.addFeature(feature);
                if (!this._queryLayer.getVisible()) {
                    this._queryLayer.setVisible(true);
                }

                this.doAreaInfoSearch((feature as Feature<olPolygon>).getGeometry());

            }
        });

        cancelButton.addEventListener('click', e => {
            this.activatePointSearch();
            this._gifwMapInstance.hidePopup();
        })

        this._gifwMapInstance.popupOverlay.overlay.setPosition(searchCoord);
        this._gifwMapInstance.popupOverlay.overlay.panIntoView({
            margin: 60,
            animation: { duration: 250 }
        });

        this._gifwMapInstance.popupOverlay.overlay.once('change:position', () => this.activatePointSearch())

    }

    private activatePointSearch() {
        document.getElementById(this._gifwMapInstance.id).dispatchEvent(new Event('gifw-info-point-activate'));
    }

    public activateAreaQueryDrawing() {

        //switch layer if it isn't on already
        if (!this._queryLayer.getVisible()) {
            this._queryLayer.setVisible(true);
        }
        /*enable esc to cancel*/
        this._keyboardEventAbortController = new AbortController();
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._drawControl.abortDrawing();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                this._drawControl.removeLastPoint();
            }
        },
            { signal: this._keyboardEventAbortController.signal }
        );
        this._gifwMapInstance.olMap.getTargetElement().style.cursor = 'crosshair';
        const activeTip =
            'Click to draw. Double or right click to finish'
        const idleTip = 'Click to start drawing';
        let tip = idleTip;
        this._drawControl = new Draw({
            source: this._vectorSource,
            type: 'Polygon',
            stopClick: true,
            condition: e => {
                // this handles right click to finish functionality
                if ((e.originalEvent as PointerEvent).buttons === 1) {
                    return true;
                } else if ((e.originalEvent as PointerEvent).buttons === 2) {
                    //when we right click to finish we have to manually append the new coordinates to the drawing
                    this._drawControl.appendCoordinates([e.coordinate]);
                    this._drawControl.finishDrawing();
                    return false;
                } else {
                    return false;
                }
            },
            freehandCondition: olConditionNever,
            style: (feature) => {
                return this.getStyleForQueryFeature(feature, tip);
            }
        });
        this._drawControl.on('drawstart', () => {
            if (!this._queryLayer.getVisible()) {
                this._queryLayer.setVisible(true);
            }
            tip = activeTip;
        });
        this._drawControl.on('drawend', (e: DrawEvent) => {
            if (!this._queryLayer.getVisible()) {
                this._queryLayer.setVisible(true);
            }
            this.addAreaQueryInfoToPopup((e.feature as Feature<any>));
            this.doAreaInfoSearch((e.feature as Feature<olPolygon>).getGeometry());
            /*TODO - YUCK YUCK YUCK. Code smell here*/
            /*This line prevents the context menu triggering when right clicking to finish*/
            window.setTimeout(() => { this.deactivateAreaQueryDrawing(); }, 100);


        });


        this._drawControl.on('drawabort', (e) => {
            tip = idleTip;
        });

        this._gifwMapInstance.olMap.addInteraction(this._drawControl);

        this._gifwMapInstance.disableContextMenu();

    }


    private deactivateAreaQueryDrawing(): void {
        this._keyboardEventAbortController?.abort();
        this._gifwMapInstance.olMap.getTargetElement().style.cursor = '';
        this._drawControl?.setActive(false);
        this._gifwMapInstance.olMap.removeInteraction(this._drawControl);
        document.getElementById(this._gifwMapInstance.id).dispatchEvent(new Event('gifw-feature-query-activate'));

    }

    private async getSearchPromisesForLayers(searchableLayers: Layer<any, any>[], searchPolygon: olPolygon): Promise<Promise<FeatureQueryResponse>[]> {
        let searchPromises: Promise<FeatureQueryResponse>[] = [];
        for (const layer of searchableLayers) {
            let source = layer.getSource();
            if (source instanceof TileWMS || source instanceof ImageWMS) {
                let sourceParams = source.getParams();
                let featureTypeName = sourceParams.LAYERS;
                //get feature type description and capabilities from server
                let baseUrl: string;
                if (source instanceof TileWMS) {
                    baseUrl = source.getUrls()[0];
                } else {
                    baseUrl = source.getUrl();
                }

                let authKey = Util.Helper.getValueFromObjectByKey(sourceParams, "authkey");
                let additionalParams = {};
                if (authKey) {
                    additionalParams = { authkey: authKey };
                }
                const gifwLayer = this._gifwMapInstance.getLayerConfigById(layer.get('layerId'));
                const layerHeaders = Util.Mapping.extractCustomHeadersFromLayerSource(gifwLayer.layerSource);
                let serverCapabilities = await Metadata.getBasicCapabilities(baseUrl, additionalParams, undefined, layerHeaders);

                if (serverCapabilities &&
                    serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType && c.url !== '').length !== 0 &&
                    serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WFS_GetFeature && c.url !== '').length !== 0
                ) {
                    //has all relevant capabilities
                    let describeFeatureCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType)[0];

                    let proxyEndpoint = "";
                    
                    if (layer.get('gifw-proxy-meta-requests') === "true") {
                        proxyEndpoint = `${document.location.protocol}//${this._gifwMapInstance.config.appRoot}proxy`;
                    }

                    let featureDescription = await Metadata.getDescribeFeatureType(describeFeatureCapability.url, featureTypeName, describeFeatureCapability.method,undefined,proxyEndpoint);
                    if (featureDescription) {
                        let geomColumnName = featureDescription.featureTypes[0].properties.filter(p => p.type.indexOf("gml:") === 0);
                        if (geomColumnName.length !== 0) {

                            //get any relevant filters and apply to the request
                            let params = source.getParams();
                            let olFilters = this.convertTextFiltersToOLFilters(params, featureDescription);
                            let wfsFilters = [intersectsFilter(geomColumnName[0].name, searchPolygon), ...olFilters];

                            let finalFilter;
                            if (wfsFilters.length > 1) {
                                finalFilter = andFilter(...wfsFilters);
                            } else {
                                finalFilter = wfsFilters[0];
                            }

                            let wfsFeatureInfoRequest = new WFS().writeGetFeature({
                                srsName: 'EPSG:3857',
                                featureTypes: [featureTypeName],
                                featureNS: featureDescription.targetNamespace,
                                featurePrefix: featureDescription.targetPrefix,
                                filter:
                                    finalFilter
                            });

                            let getFeatureCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WFS_GetFeature)[0];

                            let request: FeatureQueryRequest = {
                                layer: layer, wfsRequest: wfsFeatureInfoRequest, searchUrl: getFeatureCapability.url, searchMethod: getFeatureCapability.method
                            };
                            searchPromises.push(this.getFeatureInfoForLayer(request));
                        } else {
                            let promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
                                reject('could not determine geometry column name from list');
                            });
                            searchPromises.push(promise);
                        }
                    } else {
                        //server did not return a valid featureDescription response
                        let promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
                            reject('server did not return a valid featureDescription response');
                        });
                        searchPromises.push(promise);
                    }
                } else {
                    //server is incapable of doing what we need
                    let promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
                        reject('server did not return a valid capabilities document');
                    });
                    searchPromises.push(promise);

                }
            } else if (source instanceof Vector) {

                let features = new Set<Feature<Geometry> | RenderFeature>();

                let searchPolygonClone = new Feature(searchPolygon).clone();
                let searchFeatureGeom = searchPolygonClone.getGeometry();
                searchFeatureGeom.transform('EPSG:3857', 'EPSG:4326');
                searchPolygonClone.setGeometry(searchFeatureGeom);
                let formatter = new GeoJSON({
                    dataProjection: 'EPSG:4326'
                });
                let turfSearchPolygon = formatter.writeFeatureObject(searchPolygonClone);

                let sourceCandidates = source.getFeaturesInExtent(searchPolygon.getExtent());
                if (sourceCandidates?.length !== 0) {
                    sourceCandidates.forEach(f => {
                        /*This test makes sure we don't query the polygon we are using for the search*/
                        if (f.getGeometry() !== searchPolygon) {
                            let featureType = f.getGeometry().getType();
                            let sourceFeatureClone = f.clone();
                            let sourceFeatureGeom = sourceFeatureClone.getGeometry();
                            sourceFeatureGeom.transform('EPSG:3857', 'EPSG:4326');
                            sourceFeatureClone.setGeometry(sourceFeatureGeom);
                            let formatter = new GeoJSON({
                                dataProjection: 'EPSG:4326'
                            });
                            let turfSourceFeature = formatter.writeFeatureObject(sourceFeatureClone);
                            if (featureType === 'Polygon' || featureType === 'MultiPolygon') {

                                if (intersect(turfSearchPolygon as any, turfSourceFeature as any) !== null) {
                                    features.add(f);
                                }
                            } else if (featureType === 'Point') {
                                if (pointsWithinPolygon(turfSourceFeature as any, turfSearchPolygon as any) !== null) {
                                    features.add(f);
                                }
                            } else if (featureType === 'LineString') {
                                if (lineIntersect(turfSearchPolygon as any, turfSourceFeature as any) !== null) {
                                    features.add(f);
                                }
                            }
                        }
                    })
                }


                let promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
                    let infoClickResponse: FeatureQueryResponse = {
                        features: Array.from(features),
                        layer: layer
                    }
                    resolve(infoClickResponse)
                });
                searchPromises.push(promise);


            }

        };
        return searchPromises;
    }

    private getFeatureInfoForLayer(request: FeatureQueryRequest): Promise<FeatureQueryResponse> {
        let abortController = new AbortController();
        let timer = window.setTimeout(() => abortController.abort(), this._maxTimeout);
        let promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
            let fetchUrl = request.searchUrl;
            if (request.layer.get('gifw-proxy-meta-request') === true) {
                fetchUrl = this._gifwMapInstance.createProxyURL(request.searchUrl);
            }
            const gifwLayer = this._gifwMapInstance.getLayerConfigById(request.layer.get('layerId'), [LayerGroupType.Overlay]);
            const layerHeaders = Util.Mapping.extractCustomHeadersFromLayerSource(gifwLayer.layerSource);
            layerHeaders.append('Content-Type', 'application/vnd.ogc.gml');
            fetch(fetchUrl, {
                method: request.wfsRequest ? "POST" : "GET",
                mode: 'cors',
                headers: layerHeaders,
                body: request.wfsRequest ? new XMLSerializer().serializeToString(request.wfsRequest) : null,
                signal: abortController.signal
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                }).then(data => {
                    //if the request was a WFS, use the GML reader, else use the WMSGetFeatureInfo reader
                    let features = request.wfsRequest ? new GML3().readFeatures(data) : new WMSGetFeatureInfo().readFeatures(data);

                    let response: FeatureQueryResponse = {
                        layer: request.layer,
                        features: features
                    }

                    resolve(response);
                })
                .catch(error => {
                    console.error(error);
                    reject(`Failed to get feature info for layer ${request.layer.get("name")}`);
                })
                .finally(() => {
                    window.clearTimeout(timer);
                });
        })

        return promise;
    }

    public addAreaQueryInfoToPopup(feature: Feature<any>) {

        let timeOpts: Intl.DateTimeFormatOptions = {
            hour: 'numeric', minute: 'numeric'
        };

        let formattedTime = new Intl.DateTimeFormat(Intl.DateTimeFormat().resolvedOptions().locale, timeOpts).format(new Date());

        let popupContent = `<h1>Polygon query</h1>
                            <p>Created at ${formattedTime}</p>`;

        let searchAgainAction = new GIFWPopupAction("Search again using this polygon", () => {
            this.doAreaInfoSearch(feature.getGeometry());
        }, false);

        let removeAction = new GIFWPopupAction("Remove query polygon", () => {
            (this._queryLayer.getSource() as VectorSource<any>).removeFeature(feature);
            if ((this._queryLayer.getSource() as VectorSource<any>).getFeatures().length === 0) {
                this._queryLayer.setVisible(false);
            }
        });
        let removeAllAction = new GIFWPopupAction("Remove all query polygons", () => {
            (this._queryLayer.getSource() as VectorSource<any>).clear();
            this._queryLayer.setVisible(false);
        });
        let popupOpts = new GIFWPopupOptions(popupContent, [searchAgainAction, removeAction, removeAllAction]);
        feature.set('gifw-popup-opts', popupOpts)
        feature.set('gifw-popup-title', `Polygon query created at ${formattedTime}`)
    }

    private getSearchableLayers(searchGeom: Geometry) {
        let roundedZoom = Math.ceil(this._gifwMapInstance.olMap.getView().getZoom());


        let layerGroups = this._gifwMapInstance.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative]);

        let layers: Layer<any, any>[] = [];
        layerGroups.forEach(lg => {
            layers = layers.concat(lg.olLayerGroup.getLayersArray());
        })
        let visibleLayers = layers.filter(
            l => l.getVisible() === true &&
                l.get("gifw-queryable") !== false &&
                !((l.getMaxZoom() < roundedZoom) || (l.getMinZoom() >= roundedZoom))

        );

        let searchableLayers: Layer<any, any>[] = [];

        visibleLayers.forEach(l => {
            //check layer is actually visible and can be clicked
            let outsideExtent = false;
            let layerExtent = l.getExtent();
            if (layerExtent) {
                outsideExtent = !searchGeom.intersectsExtent(layerExtent);
            }
            if (!outsideExtent) {
                searchableLayers.push(l);
            }
        });

        return searchableLayers;
    }

    private convertTextFiltersToOLFilters(params:any, featureDescription: DescribeFeatureType): Filter[] {
        let timeFilter: string;
        let cqlFilter: string;
        for (const property in params) {
            if (property.toLowerCase() === 'time') {
                timeFilter = params[property];
            }
            if (property.toLowerCase() === 'cql_filter') {
                cqlFilter = params[property];
            }
        }

        let wfsFilters = [];

        if (timeFilter) {
            let dateTimeColumns = featureDescription.featureTypes[0].properties.filter(p => p.type.indexOf("xsd:date") === 0 || p.type.indexOf("xsd:time") === 0);
            if (dateTimeColumns.length === 1) {
                //split the date if possible
                let filter: any = equalToFilter(dateTimeColumns[0].name, timeFilter);
                let dateTimeValues = timeFilter.split('/');
                if (dateTimeValues.length === 2) {
                    //This is a nasty hack to allow date times to use between whilst still working on WFS 1.1.0.
                    //No guarantee this will work, but this whole section is a bit hacky
                    filter = betweenFilter(dateTimeColumns[0].name, dateTimeValues[0] as any, dateTimeValues[1] as any)
                    //ideally, this line would be the one we'd use
                    //filter = duringFilter(dateTimeColumns[0].name, dateTimeValues[0], dateTimeValues[1])
                }
                wfsFilters.push(filter);
            } else {
                //there was either no detected date time cols, or more than 1. Either way, we can't handle this!
                console.warn(`Time filter '${timeFilter}' could not be used in the GetFeature request`)
            }
        }
        if (cqlFilter) {
            let cqlFormat = new CQL();
            let filter = cqlFormat.read(cqlFilter);
            wfsFilters.push(filter);
        }

        return wfsFilters;
    }

    private getStyleForQueryFeature(feature: RenderFeature | Feature<any>, tip?: string) {
        const styles = [this._basicStyle];
        const geometry = feature.getGeometry();
        const type = geometry.getType();

        if (
            tip &&
            type === 'Point'

        ) {
            this._tipPoint = geometry;
            this._tipStyle.getText().setText(tip);
            styles.push(this._tipStyle);
        }
        return styles;
    }

    private getBasicStyle(): Style {
        return new Style({
            fill: new Fill({
                color: `rgba(0,0,0, 0.1)`
            }),
            stroke: new Stroke({
                color: `rgb(0,0,0)`,
                width: 2,
            }),
            image: new CircleStyle({
                radius: 5,
                stroke: new Stroke({
                    color: 'rgba(0,0, 0, 0.7)',
                }),
                fill: new Fill({
                    color: `rgba(0,0,0, 0.2)`
                }),
            }),
        });
    }

    private getTipStyle(): Style {
        return new Style({
            text: new Text({
                font: '12px Arial,sans-serif',
                fill: new Fill({
                    color: 'rgba(255, 255, 255, 1)',
                }),
                backgroundFill: new Fill({
                    color: 'rgba(0, 0, 0, 0.4)',
                }),
                padding: [2, 2, 2, 2],
                textAlign: 'left',
                offsetX: 15,
            }),
        });
    }

}