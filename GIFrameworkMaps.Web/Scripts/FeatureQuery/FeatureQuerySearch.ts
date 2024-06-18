import Buffer from "@turf/buffer";
import { point as turfPoint, Units as turfUnits } from "@turf/helpers";
import intersect from "@turf/intersect";
import lineIntersect from "@turf/line-intersect";
import pointsWithinPolygon from "@turf/points-within-polygon";
import { Feature, VectorTile } from "ol";
import { Coordinate } from "ol/coordinate";
import { never as olConditionNever } from "ol/events/condition";
import { GeoJSON, WFS, WMSGetFeatureInfo } from "ol/format";
import GML3 from "ol/format/GML3";
import {
  and as andFilter,
  between as betweenFilter,
  equalTo as equalToFilter,
  intersects as intersectsFilter,
} from "ol/format/filter";
import Filter from "ol/format/filter/Filter";
import { Geometry, Point as olPoint, Polygon as olPolygon } from "ol/geom";
import Draw, { DrawEvent } from "ol/interaction/Draw";
import { Layer } from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import RenderFeature from "ol/render/Feature";
import LayerRenderer from "ol/renderer/Layer";
import { ImageWMS, OGCVectorTile, Source, TileWMS, Vector } from "ol/source";
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
import {
  AlertSeverity,
  AlertType,
  CustomError,
  Helper,
  Mapping as MappingUtil,
} from "../Util";
import { FeatureQueryResultRenderer } from "./FeatureQueryResultRenderer";
import IsBetween from "ol/format/filter/IsBetween";
import EqualTo from "ol/format/filter/EqualTo";

export class FeatureQuerySearch {
  _gifwMapInstance: GIFWMap;
  _maxTimeout: number = 10000;
  _searchResultRenderer: FeatureQueryResultRenderer;
  _drawControl: Draw;
  _basicStyle: Style;
  _tipStyle: Style;
  _tipPoint: Geometry;
  _queryLayer: VectorLayer<Feature<Geometry>>;
  _vectorSource: VectorSource<Feature>;
  _keyboardEventAbortController: AbortController;

  constructor(gifwMapInstance: GIFWMap) {
    this._gifwMapInstance = gifwMapInstance;
    this._searchResultRenderer = new FeatureQueryResultRenderer(
      gifwMapInstance,
    );
    this._vectorSource = new VectorSource();
    this._basicStyle = this.getBasicStyle();
    this._tipStyle = this.getTipStyle();

    this._queryLayer = gifwMapInstance.addNativeLayerToMap(
      this._vectorSource,
      "Query Polygons",
      (feature: Feature<Geometry>) => {
        return this.getStyleForQueryFeature(feature);
      },
      false,
      LayerGroupType.SystemNative,
    );
  }

  public doInfoSearch(searchCoord: number[], searchPixel: number[]) {
    const searchGeom = new olPoint(searchCoord);
    const searchableLayers = this.getSearchableLayers(searchGeom);
    if (searchableLayers.length !== 0) {
      const searchPromises: Promise<FeatureQueryResponse>[] = [];
      const layerNames: string[] = [];
      searchableLayers.forEach((layer) => {
        const source = layer.getSource();
        if (source instanceof TileWMS || source instanceof ImageWMS) {
          const featureInfoURL = source.getFeatureInfoUrl(
            searchCoord,
            this._gifwMapInstance.olMap.getView().getResolution(),
            this._gifwMapInstance.olMap.getView().getProjection(),
            {
              INFO_FORMAT: "application/vnd.ogc.gml",
              FEATURE_COUNT: 100,
            },
          );
          const request: FeatureQueryRequest = {
            layer: layer,
            searchUrl: featureInfoURL,
          };
          searchPromises.push(this.getFeatureInfoForLayer(request));
          layerNames.push(layer.get("name"));
        } else if (source instanceof Vector || source instanceof OGCVectorTile || source instanceof VectorTile) {
          const features = new Set<Feature<Geometry> | RenderFeature>();
          this._gifwMapInstance.olMap
            .getFeaturesAtPixel(searchPixel, {
              layerFilter: (l) => {
                return l === layer;
              },
            })
            .forEach((f) => {
              features.add(f);
            });
          if (source instanceof Vector) {
            // Add features at the search coordinates that may not be visible at the search pixel, e.g. features with a fill opacity of zero
            source.getFeaturesAtCoordinate(searchCoord).forEach((f) => {
              features.add(f);
            });
          }

          layerNames.push(layer.get("name"));

          const promise = new Promise<FeatureQueryResponse>((resolve) => {
            const infoClickResponse: FeatureQueryResponse = {
              features: Array.from(features) as Feature[],
              layer: layer,
            };
            resolve(infoClickResponse);
          });
          searchPromises.push(promise);
        }
      });

      this._searchResultRenderer.showLoadingPopup(layerNames, searchCoord);
      Promise.allSettled(searchPromises).then((promises) => {
        this.resolveSearchPromises(promises, searchCoord);
      });
    }
  }

  public async doAreaInfoSearch(searchPolygon: olPolygon) {
    const searchableLayers = this.getSearchableLayers(searchPolygon);
    if (searchableLayers.length !== 0) {
      const layerNames: string[] = [];
      searchableLayers.forEach((l) => {
        layerNames.push(l.get("name"));
      });
      const coordLen = searchPolygon.getCoordinates()[0].length;

      const popupCoord = searchPolygon.getCoordinates()[0][coordLen - 2];
      this._searchResultRenderer.showLoadingPopup(layerNames, popupCoord);
      const searchPromises = await this.getSearchPromisesForLayers(
        searchableLayers,
        searchPolygon,
      );

      Promise.allSettled(searchPromises).then((promises) => {
        this.resolveSearchPromises(promises, popupCoord);
      });
    }
  }

  private resolveSearchPromises(
    promises: PromiseSettledResult<FeatureQueryResponse>[],
    popupCoord: Coordinate,
  ) {
    const completedPromises = promises.filter(
      (p) => p.status === "fulfilled",
    ) as PromiseFulfilledResult<FeatureQueryResponse>[];
    const responsesWithData: FeatureQueryResponse[] = [];
    completedPromises.forEach((p) => {
      const response = p.value;
      if (response.features.length !== 0) {
        responsesWithData.push(response);
      }
    });

    if (responsesWithData.length !== 0) {
      const numLayers = responsesWithData.length;
      const hasFeatures = responsesWithData.some((r) => r.features.length > 0);
      if (hasFeatures) {
        if (numLayers === 1 && responsesWithData[0].features.length === 1) {
          this._searchResultRenderer.showFeaturePopup(
            popupCoord,
            responsesWithData[0].layer,
            responsesWithData[0].features[0],
          );
        } else {
          this._searchResultRenderer.showFeatureArrayPopup(
            popupCoord,
            responsesWithData,
          );
        }
      } else {
        this._searchResultRenderer.showNoFeaturesPopup(popupCoord);
      }
    } else {
      this._searchResultRenderer.showNoFeaturesPopup(popupCoord);
    }

    const failedPromises = promises.filter((p) => p.status !== "fulfilled");

    if (failedPromises.length !== 0) {
      const msgs: string[] = [];
      failedPromises.forEach((failedPromise) => {
        console.error(failedPromise.status);
        msgs.push(failedPromise.status);
      });
      const err = new CustomError(
        responsesWithData.length === 0 ? AlertType.Popup : AlertType.Toast,
        AlertSeverity.Danger,
        `Feature request failed`,
        `${msgs.length} layer${
          msgs.length !== 1 ? "s" : ""
        } had a problem when returning feature information`,
      );
      err.show();
    }
  }

  public doBufferSearch(searchCoord: number[]) {
    const popup = this._gifwMapInstance.popupOverlay.overlay.getElement();

    const queryForm = `<div class="mb-3">
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
                            </div>`;

    const outerForm = document.createElement("form");
    outerForm.innerHTML = queryForm;

    const submitButton = document.createElement("button");
    submitButton.innerText = "Search";
    submitButton.className = "btn btn-outline-primary btn-sm";
    submitButton.type = "submit";
    outerForm.appendChild(submitButton);

    const cancelButton = document.createElement("button");
    cancelButton.innerText = "Cancel";
    cancelButton.className = "btn btn-text btn-sm ms-2";
    cancelButton.type = "button";
    outerForm.appendChild(cancelButton);

    popup.querySelector("#gifw-popup-content").innerHTML =
      "<h1>Buffer search</h1><p>Enter a size for your buffer and hit search.</p>";
    popup.querySelector("#gifw-popup-content").appendChild(outerForm);
    outerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (outerForm.checkValidity()) {
        this._gifwMapInstance.popupOverlay.overlay.un("change:position", () =>
          this.activatePointSearch(),
        );
        //create the geometry
        const formatter = new GeoJSON({
          dataProjection: "EPSG:4326",
        });
        const radius = (
          outerForm.querySelector("input[type=number]") as HTMLInputElement
        ).valueAsNumber;
        const units = (outerForm.querySelector("select") as HTMLSelectElement)
          .value;
        const turfUnit = units as turfUnits;

        //submit to the area query searcher
        const featureGeom = new olPoint(searchCoord);
        featureGeom.transform(
          this._gifwMapInstance.olMap.getView().getProjection(),
          "EPSG:4326",
        );

        const point = turfPoint(featureGeom.getCoordinates());
        const buffer = Buffer(point, radius, { units: turfUnit });

        const bufferedFeature = formatter.readFeature(
          buffer,
        ) as Feature<olPolygon>;
        const bufferedGeometry = bufferedFeature.getGeometry();
        bufferedGeometry.transform(
          "EPSG:4326",
          this._gifwMapInstance.olMap.getView().getProjection(),
        );
        const feature = new Feature(bufferedGeometry);
        this.addAreaQueryInfoToPopup(feature);
        this._vectorSource.addFeature(feature);
        if (!this._queryLayer.getVisible()) {
          this._queryLayer.setVisible(true);
        }

        this.doAreaInfoSearch((feature as Feature<olPolygon>).getGeometry());
      }
    });

    cancelButton.addEventListener("click", () => {
      this.activatePointSearch();
      this._gifwMapInstance.hidePopup();
    });

    this._gifwMapInstance.popupOverlay.overlay.setPosition(searchCoord);
    this._gifwMapInstance.popupOverlay.overlay.panIntoView({
      margin: 60,
      animation: { duration: 250 },
    });

    this._gifwMapInstance.popupOverlay.overlay.once("change:position", () =>
      this.activatePointSearch(),
    );
  }

  private activatePointSearch() {
    document
      .getElementById(this._gifwMapInstance.id)
      .dispatchEvent(new Event("gifw-info-point-activate"));
  }

  public activateAreaQueryDrawing() {
    //switch layer if it isn't on already
    if (!this._queryLayer.getVisible()) {
      this._queryLayer.setVisible(true);
    }
    /*enable esc to cancel*/
    this._keyboardEventAbortController = new AbortController();
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") {
          this._drawControl.abortDrawing();
        } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          this._drawControl.removeLastPoint();
        }
      },
      { signal: this._keyboardEventAbortController.signal },
    );
    this._gifwMapInstance.olMap.getTargetElement().style.cursor = "crosshair";
    const activeTip = "Click to draw. Double or right click to finish";
    const idleTip = "Click to start drawing";
    let tip = idleTip;
    this._drawControl = new Draw({
      source: this._vectorSource,
      type: "Polygon",
      stopClick: true,
      condition: (e) => {
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
      },
    });
    this._drawControl.on("drawstart", () => {
      if (!this._queryLayer.getVisible()) {
        this._queryLayer.setVisible(true);
      }
      tip = activeTip;
    });
    this._drawControl.on("drawend", (e: DrawEvent) => {
      if (!this._queryLayer.getVisible()) {
        this._queryLayer.setVisible(true);
      }
      this.addAreaQueryInfoToPopup(e.feature as Feature<Geometry>);
      this.doAreaInfoSearch((e.feature as Feature<olPolygon>).getGeometry());
      /*TODO - YUCK YUCK YUCK. Code smell here*/
      /*This line prevents the context menu triggering when right clicking to finish*/
      window.setTimeout(() => {
        this.deactivateAreaQueryDrawing();
      }, 100);
    });

    this._drawControl.on("drawabort", () => {
      tip = idleTip;
    });

    this._gifwMapInstance.olMap.addInteraction(this._drawControl);

    this._gifwMapInstance.disableContextMenu();
  }

  private deactivateAreaQueryDrawing(): void {
    this._keyboardEventAbortController?.abort();
    this._gifwMapInstance.olMap.getTargetElement().style.cursor = "";
    this._drawControl?.setActive(false);
    this._gifwMapInstance.olMap.removeInteraction(this._drawControl);
    document
      .getElementById(this._gifwMapInstance.id)
      .dispatchEvent(new Event("gifw-feature-query-activate"));
  }

  private async getSearchPromisesForLayers(
    searchableLayers: Layer<Source, LayerRenderer<VectorLayer<Feature<Geometry>>>>[],
    searchPolygon: olPolygon,
  ): Promise<Promise<FeatureQueryResponse>[]> {
    const searchPromises: Promise<FeatureQueryResponse>[] = [];
    for (const layer of searchableLayers) {
      const source = layer.getSource();
      if (source instanceof TileWMS || source instanceof ImageWMS) {
        const sourceParams = source.getParams();
        const featureTypeName = sourceParams.LAYERS;
        //get feature type description and capabilities from server
        let baseUrl: string;
        if (source instanceof TileWMS) {
          baseUrl = source.getUrls()[0];
        } else {
          baseUrl = source.getUrl();
        }

        const authKey = Helper.getValueFromObjectByKey(sourceParams, "authkey");
        let additionalParams = {};
        if (authKey) {
          additionalParams = { authkey: authKey };
        }
        const gifwLayer = this._gifwMapInstance.getLayerConfigById(
          layer.get("layerId"),
        );
        const layerHeaders = MappingUtil.extractCustomHeadersFromLayerSource(
          gifwLayer.layerSource,
        );
        const serverCapabilities = await Metadata.getBasicCapabilities(
          baseUrl,
          additionalParams,
          undefined,
          layerHeaders,
        );

        if (
          serverCapabilities &&
          serverCapabilities.capabilities.filter(
            (c) =>
              c.type === CapabilityType.DescribeFeatureType && c.url !== "",
          ).length !== 0 &&
          serverCapabilities.capabilities.filter(
            (c) => c.type === CapabilityType.WFS_GetFeature && c.url !== "",
          ).length !== 0
        ) {
          //has all relevant capabilities
          const describeFeatureCapability =
            serverCapabilities.capabilities.filter(
              (c) => c.type === CapabilityType.DescribeFeatureType,
            )[0];

          let proxyEndpoint = "";

          if (layer.get("gifw-proxy-meta-requests") === "true") {
            proxyEndpoint = `${document.location.protocol}//${this._gifwMapInstance.config.appRoot}proxy`;
          }
          const httpHeaders = MappingUtil.extractCustomHeadersFromLayerSource(
            gifwLayer.layerSource,
          );
          const featureDescription = await Metadata.getDescribeFeatureType(
            describeFeatureCapability.url,
            featureTypeName,
            describeFeatureCapability.method,
            undefined,
            proxyEndpoint,
            undefined,
            httpHeaders,
          );
          if (featureDescription) {
            const geomColumnName =
              featureDescription.featureTypes[0].properties.filter(
                (p) => p.type.indexOf("gml:") === 0,
              );
            if (geomColumnName.length !== 0) {
              //get any relevant filters and apply to the request
              const params = source.getParams();
              const olFilters = this.convertTextFiltersToOLFilters(
                params,
                featureDescription,
              );
              const wfsFilters = [
                intersectsFilter(geomColumnName[0].name, searchPolygon),
                ...olFilters,
              ];

              let finalFilter;
              if (wfsFilters.length > 1) {
                finalFilter = andFilter(...wfsFilters);
              } else {
                finalFilter = wfsFilters[0];
              }

              const wfsFeatureInfoRequest = new WFS().writeGetFeature({
                srsName: this._gifwMapInstance.olMap.getView().getProjection().getCode(),
                featureTypes: [featureTypeName],
                featureNS: featureDescription.targetNamespace,
                featurePrefix: featureDescription.targetPrefix,
                filter: finalFilter,
              });

              const getFeatureCapability =
                serverCapabilities.capabilities.filter(
                  (c) => c.type === CapabilityType.WFS_GetFeature,
                )[0];

              const request: FeatureQueryRequest = {
                layer: layer,
                wfsRequest: wfsFeatureInfoRequest,
                searchUrl: getFeatureCapability.url,
                searchMethod: getFeatureCapability.method,
              };
              searchPromises.push(this.getFeatureInfoForLayer(request));
            } else {
              const promise = new Promise<FeatureQueryResponse>(
                (resolve, reject) => {
                  reject("could not determine geometry column name from list");
                },
              );
              searchPromises.push(promise);
            }
          } else {
            //server did not return a valid featureDescription response
            const promise = new Promise<FeatureQueryResponse>(
              (resolve, reject) => {
                reject(
                  "server did not return a valid featureDescription response",
                );
              },
            );
            searchPromises.push(promise);
          }
        } else {
          //server is incapable of doing what we need
          const promise = new Promise<FeatureQueryResponse>(
            (resolve, reject) => {
              reject("server did not return a valid capabilities document");
            },
          );
          searchPromises.push(promise);
        }
      } else if (source instanceof Vector) {
        const features = new Set<Feature<Geometry> | RenderFeature>();

        const searchPolygonClone = new Feature(searchPolygon).clone();
        const searchFeatureGeom = searchPolygonClone.getGeometry();
        searchFeatureGeom.transform("EPSG:3857", "EPSG:4326");
        searchPolygonClone.setGeometry(searchFeatureGeom);
        const formatter = new GeoJSON({
          dataProjection: "EPSG:4326",
        });
        const turfSearchPolygon =
          formatter.writeFeatureObject(searchPolygonClone);

        const sourceCandidates = source.getFeaturesInExtent(
          searchPolygon.getExtent(),
        );
        if (sourceCandidates?.length !== 0) {
          sourceCandidates.forEach((f) => {
            /*This test makes sure we don't query the polygon we are using for the search*/
            if (f.getGeometry() !== searchPolygon) {
              const featureType = f.getGeometry().getType();
              const sourceFeatureClone = f.clone();
              const sourceFeatureGeom = sourceFeatureClone.getGeometry();
              sourceFeatureGeom.transform("EPSG:3857", "EPSG:4326");
              sourceFeatureClone.setGeometry(sourceFeatureGeom);
              const formatter = new GeoJSON({
                dataProjection: "EPSG:4326",
              });
              const turfSourceFeature =
                formatter.writeFeatureObject(sourceFeatureClone);
              /* eslint-disable @typescript-eslint/no-explicit-any -- Cannot idenitify proper types to use. This code is safe as is, but handle with care */
              if (featureType === "Polygon" || featureType === "MultiPolygon") {
                if (
                  intersect(
                    turfSearchPolygon as any,
                    turfSourceFeature as any,
                  ) !== null
                ) {
                  features.add(f);
                }
              } else if (featureType === "Point") {
                if (
                  pointsWithinPolygon(
                    turfSourceFeature as any,
                    turfSearchPolygon as any,
                  ) !== null
                ) {
                  features.add(f);
                }
              } else if (featureType === "LineString") {
                if (
                  lineIntersect(
                    turfSearchPolygon as any,
                    turfSourceFeature as any,
                  ) !== null
                ) {
                  features.add(f);
                }
              }
              /* eslint-enable @typescript-eslint/no-explicit-any */
            }
          });
        }

        const promise = new Promise<FeatureQueryResponse>((resolve) => {
          const infoClickResponse: FeatureQueryResponse = {
            features: Array.from(features) as Feature[],
            layer: layer,
          };
          resolve(infoClickResponse);
        });
        searchPromises.push(promise);
      }
    }
    return searchPromises;
  }

  private getFeatureInfoForLayer(
    request: FeatureQueryRequest,
  ): Promise<FeatureQueryResponse> {
    const abortController = new AbortController();
    const timer = window.setTimeout(
      () => abortController.abort(),
      this._maxTimeout,
    );
    const promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
      let fetchUrl = request.searchUrl;
      if (request.layer.get("gifw-proxy-meta-request") === true) {
        fetchUrl = this._gifwMapInstance.createProxyURL(request.searchUrl);
      }
      const gifwLayer = this._gifwMapInstance.getLayerConfigById(
        request.layer.get("layerId"),
        [LayerGroupType.Overlay],
      );
      const layerHeaders = MappingUtil.extractCustomHeadersFromLayerSource(
        gifwLayer.layerSource,
      );
      layerHeaders.append("Content-Type", "application/vnd.ogc.gml");
      fetch(fetchUrl, {
        method: request.wfsRequest ? "POST" : "GET",
        mode: "cors",
        headers: layerHeaders,
        body: request.wfsRequest
          ? new XMLSerializer().serializeToString(request.wfsRequest)
          : null,
        signal: abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.text();
        })
        .then((data) => {
          //if the request was a WFS, use the GML reader, else use the WMSGetFeatureInfo reader
          const viewProjection = this._gifwMapInstance.olMap.getView().getProjection();
          const features = request.wfsRequest
            ? new GML3().readFeatures(data, {dataProjection: viewProjection})
            : new WMSGetFeatureInfo().readFeatures(data);

          const response: FeatureQueryResponse = {
            layer: request.layer,
            features: features,
          };

          resolve(response);
        })
        .catch((error) => {
          console.error(error);
          reject(
            `Failed to get feature info for layer ${request.layer.get("name")}`,
          );
        })
        .finally(() => {
          window.clearTimeout(timer);
        });
    });

    return promise;
  }

  public addAreaQueryInfoToPopup(feature: Feature<Geometry>) {
    const timeOpts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
    };

    const formattedTime = new Intl.DateTimeFormat(
      Intl.DateTimeFormat().resolvedOptions().locale,
      timeOpts,
    ).format(new Date());

    const popupContent = `<h1>Polygon query</h1>
                            <p>Created at ${formattedTime}</p>`;

    const searchAgainAction = new GIFWPopupAction(
      "Search again using this polygon",
      () => {
        this.doAreaInfoSearch(feature.getGeometry() as olPolygon);
      },
      false,
    );

    const removeAction = new GIFWPopupAction("Remove query polygon", () => {
      (this._queryLayer.getSource() as VectorSource<Feature>).removeFeature(
        feature,
      );
      if (
        (this._queryLayer.getSource() as VectorSource<Feature>).getFeatures()
          .length === 0
      ) {
        this._queryLayer.setVisible(false);
      }
    });
    const removeAllAction = new GIFWPopupAction(
      "Remove all query polygons",
      () => {
        (this._queryLayer.getSource() as VectorSource<Feature>).clear();
        this._queryLayer.setVisible(false);
      },
    );
    const popupOpts = new GIFWPopupOptions(popupContent, [
      searchAgainAction,
      removeAction,
      removeAllAction,
    ]);
    feature.set("gifw-popup-opts", popupOpts);
    feature.set(
      "gifw-popup-title",
      `Polygon query created at ${formattedTime}`,
    );
  }

  private getSearchableLayers(searchGeom: Geometry) {
    const roundedZoom = Math.ceil(
      this._gifwMapInstance.olMap.getView().getZoom(),
    );

    const layerGroups = this._gifwMapInstance.getLayerGroupsOfType([
      LayerGroupType.Overlay,
      LayerGroupType.UserNative,
      LayerGroupType.SystemNative,
    ]);

    let layers: Layer<Source, LayerRenderer<VectorLayer<Feature<Geometry>>>>[] = [];
    layerGroups.forEach((lg) => {
      layers = layers.concat(lg.olLayerGroup.getLayersArray());
    });
    const visibleLayers = layers.filter(
      (l) =>
        l.getVisible() === true &&
        l.get("gifw-queryable") !== false &&
        !(l.getMaxZoom() < roundedZoom || l.getMinZoom() >= roundedZoom),
    );

    const searchableLayers: Layer<Source, LayerRenderer<VectorLayer<Feature<Geometry>>>>[] = [];

    visibleLayers.forEach((l) => {
      //check layer is actually visible and can be clicked
      let outsideExtent = false;
      const layerExtent = l.getExtent();
      if (layerExtent) {
        outsideExtent = !searchGeom.intersectsExtent(layerExtent);
      }
      if (!outsideExtent) {
        searchableLayers.push(l);
      }
    });

    return searchableLayers;
  }

  private convertTextFiltersToOLFilters(
    params: Record<string, string>,
    featureDescription: DescribeFeatureType,
  ): Filter[] {
    let timeFilter: string;
    let cqlFilter: string;
    for (const property in params) {
      if (property.toLowerCase() === "time") {
        timeFilter = params[property];
      }
      if (property.toLowerCase() === "cql_filter") {
        cqlFilter = params[property];
      }
    }

    const wfsFilters = [];

    if (timeFilter) {
      const dateTimeColumns =
        featureDescription.featureTypes[0].properties.filter(
          (p) =>
            p.type.indexOf("xsd:date") === 0 ||
            p.type.indexOf("xsd:time") === 0,
        );
      if (dateTimeColumns.length === 1) {
        //split the date if possible
        let filter: EqualTo | IsBetween = equalToFilter(
          dateTimeColumns[0].name,
          timeFilter,
        );
        const dateTimeValues = timeFilter.split("/");
        if (dateTimeValues.length === 2) {
          //This is a nasty hack to allow date times to use between whilst still working on WFS 1.1.0.
          //No guarantee this will work, but this whole section is a bit hacky
          //as unknown as number is used as we are forcing the string to turn into a number
          filter = betweenFilter(
            dateTimeColumns[0].name,
            dateTimeValues[0] as unknown as number,
            dateTimeValues[1] as unknown as number,
          );
          //ideally, this line would be the one we'd use
          //filter = duringFilter(dateTimeColumns[0].name, dateTimeValues[0], dateTimeValues[1])
        }
        wfsFilters.push(filter);
      } else {
        //there was either no detected date time cols, or more than 1. Either way, we can't handle this!
        console.warn(
          `Time filter '${timeFilter}' could not be used in the GetFeature request`,
        );
      }
    }
    if (cqlFilter) {
      const cqlFormat = new CQL();
      const filter = cqlFormat.read(cqlFilter);
      wfsFilters.push(filter);
    }

    return wfsFilters;
  }

  private getStyleForQueryFeature(
    feature: RenderFeature | Feature<Geometry>,
    tip?: string,
  ) {
    const styles = [this._basicStyle];
    const geometry = feature.getGeometry();
    const type = geometry.getType();

    if (tip && type === "Point") {
      this._tipPoint = geometry as Geometry;
      this._tipStyle.getText().setText(tip);
      styles.push(this._tipStyle);
    }
    return styles;
  }

  private getBasicStyle(): Style {
    return new Style({
      fill: new Fill({
        color: `rgba(0,0,0, 0.1)`,
      }),
      stroke: new Stroke({
        color: `rgb(0,0,0)`,
        width: 2,
      }),
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: "rgba(0,0, 0, 0.7)",
        }),
        fill: new Fill({
          color: `rgba(0,0,0, 0.2)`,
        }),
      }),
    });
  }

  private getTipStyle(): Style {
    return new Style({
      text: new Text({
        font: "12px Arial,sans-serif",
        fill: new Fill({
          color: "rgba(255, 255, 255, 1)",
        }),
        backgroundFill: new Fill({
          color: "rgba(0, 0, 0, 0.4)",
        }),
        padding: [2, 2, 2, 2],
        textAlign: "left",
        offsetX: 15,
      }),
    });
  }
}
