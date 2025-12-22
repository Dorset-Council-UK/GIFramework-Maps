import OpenLayersParser from "geostyler-openlayers-parser";
import { ImageTile, View as olView } from "ol";
import { applyStyle as olMapboxApplyStyle } from 'ol-mapbox-style';
import { Extent, applyTransform, containsExtent } from "ol/extent";
import { FeatureUrlFunction } from "ol/featureloader";
import { GeoJSON, KML, MVT } from "ol/format";
import GML2 from "ol/format/GML2";
import GML3 from "ol/format/GML3";
import GML32 from "ol/format/GML32";
import * as olLayer from "ol/layer";
import BaseLayer from "ol/layer/Base";
import { all as allStrategy, bbox as bboxStrategy } from 'ol/loadingstrategy';
import * as olProj from "ol/proj";
import { getTransform, transformExtent } from "ol/proj";
import LayerRenderer from "ol/renderer/Layer";
import * as olSource from "ol/source";
import { Options as ImageWMSOptions } from "ol/source/ImageWMS";
import { Options as TileWMSOptions } from "ol/source/TileWMS";
import { Options as VectorTileOptions } from "ol/source/VectorTile";
import { Options as XYZOptions } from "ol/source/XYZ";
import TileGrid from "ol/tilegrid/TileGrid";
import { Layer } from "../Interfaces/Layer";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { TileMatrixSet } from "../Interfaces/OGCMetadata/TileMatrixSet";
import { GIFWMap } from "../Map";
import { createWFSFeatureRequestFromLayer, extractCustomHeadersFromLayerSource, getLayerSourceOptionValueByName, getOpenLayersFormatFromOGCFormat, getValueFromObjectByKey } from "../Util";
import { LayerGroup } from "./LayerGroup";

export class GIFWLayerGroup implements LayerGroup {
  layers: Layer[];
  gifwMapInstance: GIFWMap;
  olLayerGroup: olLayer.Group;
  layerGroupType: LayerGroupType;

  constructor(
    layers: Layer[],
    gifwMapInstance: GIFWMap,
    layerGroupType: LayerGroupType,
  ) {
    this.layers = layers;
    this.gifwMapInstance = gifwMapInstance;
    this.layerGroupType = layerGroupType;
  }

  /**
   * Creates a 'group' of layers (overlay or basemap) for use in OpenLayers
   *
   * @returns olLayer.Group
   *
   */
  async createLayersGroup(): Promise<olLayer.Group> {
    const ol_layers: Array<
      | olLayer.Tile<olSource.XYZ>
      | olLayer.Tile<olSource.TileWMS>
      | olLayer.Image<olSource.ImageWMS>
      | olLayer.VectorTile
      | olLayer.Vector
      | olLayer.VectorImage
      > = [];
    const defaultMapProjection = this.gifwMapInstance.config.availableProjections.filter(p => p.isDefaultMapProjection === true)[0];
    const viewProj = `EPSG:${defaultMapProjection.epsgCode ?? "3857"}`;
    if (this.layers !== null) {

      for (const layer of this.layers) {
        try {
          let ol_layer;
          /*define reused attributes*/
          const className = `${this.layerGroupType === LayerGroupType.Basemap
            ? "basemapLayer"
            : "layer"
            }-${layer.id}`;
          const visible = layer.isDefault !== undefined ? layer.isDefault : false;
          const layerMinZoom = layer.minZoom ? layer.minZoom - 1 : 0;
          const layerMaxZoom = layer.maxZoom ? layer.maxZoom : 100;
          const sourceMinZoom = layer.layerSource.minZoom;
          const sourceMaxZoom = layer.layerSource.maxZoom;
          const opacity =
            (layer.defaultOpacity !== undefined ? layer.defaultOpacity : 100) /
            100;
          let projection = viewProj;
          let hasCustomHeaders = false;
          const layerHeaders = extractCustomHeadersFromLayerSource(
            layer.layerSource,
          );
          //this is a bit of a nasty way of checking for existence of headers
          layerHeaders.forEach(() => {
            hasCustomHeaders = true;
          });
          if (
            layer.layerSource.layerSourceOptions.some(
              (l) => l.name.toLowerCase() === "projection",
            )
          ) {
            projection = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "projection");
          }
          let extent: Extent;
          if (layer.bound) {
            extent = [
              layer.bound.bottomLeftX,
              layer.bound.bottomLeftY,
              layer.bound.topRightX,
              layer.bound.topRightY,
            ];
            const extentProj = olProj.get('EPSG:3857');
            const reprojectedSourceExtent = transformExtent(extent, extentProj, "EPSG:4326");
            const viewProj = olProj.get(`EPSG:${defaultMapProjection.epsgCode ?? '3857'}`);
            if (containsExtent(reprojectedSourceExtent, viewProj.getWorldExtent())) {
              extent = transformExtent(viewProj.getWorldExtent(), 'EPSG:4326', `EPSG:${defaultMapProjection.epsgCode ?? '3857'}`);
            } else {
              extent = transformExtent(extent, 'EPSG:3857', `EPSG:${defaultMapProjection.epsgCode ?? '3857'}`);
            }
          }
          if (layer.layerSource.layerSourceType.name === 'XYZ') {
            ol_layer = this.createXYZLayer(layer, visible, className, layerMaxZoom, layerMinZoom, sourceMaxZoom, sourceMinZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);
          } else if (layer.layerSource.layerSourceType.name === 'TileWMS') {
            ol_layer = this.createTileWMSLayer(layer, visible, className, layerMaxZoom, layerMinZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection)
          } else if (layer.layerSource.layerSourceType.name === 'ImageWMS') {
            ol_layer = this.createImageWMSLayer(layer, visible, className, layerMaxZoom, layerMinZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);
          } else if (layer.layerSource.layerSourceType.name === "Vector" || layer.layerSource.layerSourceType.name === "VectorImage") {
            ol_layer = await this.createVectorLayer(layer, visible, className, layerMaxZoom, layerMinZoom, opacity, extent, projection);
          } else if (layer.layerSource.layerSourceType.name === "VectorTile") {
            ol_layer = await this.createVectorTileLayer(layer, visible, className, layerMaxZoom, layerMinZoom, opacity, extent, projection);
          } else if (layer.layerSource.layerSourceType.name === 'OGCVectorTile') {
            ol_layer = await this.createOGCVectorTileLayer(layer, visible, className, layerMaxZoom, layerMinZoom, opacity, extent, projection);
          }

          if (layer.isDefault) {
            ol_layer.setProperties({ hasBeenOpened: true });
          }

          ol_layer.setProperties({ layerId: layer.id });
          ol_layer.setProperties({ "gifw-queryable": layer.queryable });
          ol_layer.setProperties({
            "gifw-proxy-meta-request": layer.proxyMetaRequests,
          });
          ol_layer.setProperties({ name: layer.name });
          ol_layer.setProperties({ saturation: layer.defaultSaturation });
          ol_layer.setProperties({ layerGroupType: this.layerGroupType });
          if (layer.filterable && !layer.defaultFilterEditable) {
            if (
              layer.layerSource.layerSourceType.name === "TileWMS" ||
              layer.layerSource.layerSourceType.name === "ImageWMS"
            ) {
              // Use case-insensitive lookup for CQL_FILTER parameter
              const params = (
                ol_layer.getSource() as olSource.TileWMS | olSource.ImageWMS
              ).getParams();
              const cqlFilter = getValueFromObjectByKey(params, "cql_filter");
              if (cqlFilter) {
                ol_layer.setProperties({
                  "gifw-default-filter": cqlFilter,
                });
              }
            }
          }
          ol_layers.push(ol_layer);
          if (layer.refreshInterval && layer.refreshInterval > 0) {
            this.setAutoRefreshInterval(ol_layer, layer.refreshInterval);
            }
        } catch (ex) {
          //simple general catch for a failed layer addition
          console.error(ex);
        }
      }
    }

    const layerGroup = new olLayer.Group({
      layers: ol_layers,
    });
    layerGroup.setProperties({ type: this.layerGroupType });

    return layerGroup;
  }

  async customTileLoader(
    imageTile: ImageTile,
    src: string,
    layerHeaders: Headers
  ) {
    try {
      this.gifwMapInstance.authManager.applyAuthenticationToRequestHeaders(src, layerHeaders);
      const resp = await fetch(src, {
        headers: layerHeaders,
        mode: "cors",
      });
      if (resp.ok) {
        const respBlob = await resp.blob();
        const url = URL.createObjectURL(respBlob);
        const img = imageTile.getImage();
        img.addEventListener("load", () => {
          URL.revokeObjectURL(url);
        });
        (img as HTMLImageElement).src = url;
      } else {
        throw Error();
      }
    } catch {
      imageTile.setState(3);
    }
  }

  /**
   * Adds the basic change events required on all types of layer
   *
   * @returns void
   *
   */
  addChangeEvents(): void {
    this.olLayerGroup.getLayers().forEach((l) => {
      this.addChangeEventsForLayer(l);
    });
  }

  private addChangeEventsForLayer(layer: BaseLayer) {
    layer.on("change:visible", (e) => {
      document
        .getElementById(this.gifwMapInstance.id)
        .dispatchEvent(new CustomEvent("gifw-update-permalink"));
      //we only want to trigger this when its made visible, not when its hidden
      if (e.oldValue === false) {
        const layerId = layer.get("layerId");
        if (!layer.get("hasBeenOpened")) {
          if (this.layerGroupType === LayerGroupType.Basemap) {
            const basemap = this.gifwMapInstance.config.basemaps.filter(
              (b) => b.id === layerId,
            )[0];
            if (basemap !== null && basemap.defaultSaturation !== 100) {
              //get the default saturation and trigger a postrender once to apply it.
              this.gifwMapInstance.setInitialSaturationOfBasemap(
                basemap.defaultSaturation,
              );
            }
          }
        }
        layer.set("hasBeenOpened", true);
        if (this.layerGroupType === LayerGroupType.Basemap) {
          const currentView = this.gifwMapInstance.olMap.getView();
          const fromLonLat = getTransform('EPSG:4326', currentView.getProjection());
          this.gifwMapInstance.olMap.setView(
            new olView({
              center: currentView.getCenter(),
              zoom: currentView.getZoom(),
              rotation: currentView.getRotation(),
              projection: currentView.getProjection(),
              extent: applyTransform(currentView.getProjection().getWorldExtent(), fromLonLat),
              constrainOnlyCenter: true,
              maxZoom: layer.getMaxZoom(),
              minZoom:
                layer.getMinZoom() +
                1 /*Min zoom on the view should be one higher than the layer itself to prevent layer from disappearing at last zoom level*/,
            }),
          );
        }
      }
    });
  }

  private setAutoRefreshInterval(layer: olLayer.Layer<olSource.Source, LayerRenderer<olLayer.Layer>>, interval: number) {
    setInterval(() => {
      if (layer.isVisible()) {
        layer.getSource().refresh();
      }
    }, interval * 1000)
  }

  addLayerToGroup(
    layer: Layer,
    ol_layer: olLayer.Layer<olSource.Source, LayerRenderer<olLayer.Layer>>,
  ): void {
    this.layers.push(layer);
    const newLayerGroup = this.olLayerGroup.getLayers();
    newLayerGroup.push(ol_layer);
    this.olLayerGroup.setLayers(newLayerGroup);
    this.addChangeEventsForLayer(ol_layer);
    if (layer.refreshInterval && layer.refreshInterval > 0) {
      this.setAutoRefreshInterval(ol_layer, layer.refreshInterval);
    }
  }

  private createXYZLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    layerMaxZoom: number,
    layerMinZoom: number,
    sourceMaxZoom: number,
    sourceMinZoom: number,
    opacity: number,
    extent: Extent,
    layerHeaders: Headers,
    hasCustomHeaders: boolean,
    projection: string) {
    const url = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const xyzOpts: XYZOptions = {
      url: url,
      attributions: layer.layerSource.attribution.renderedAttributionHTML,
      crossOrigin: "anonymous",
      projection: projection,
    };
    if (sourceMinZoom != null) {
      xyzOpts.minZoom = sourceMinZoom;
    }
    if (sourceMaxZoom != null) {
      xyzOpts.maxZoom = sourceMaxZoom;
    }
    const tileGrid = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "tilegrid");
    if (tileGrid !== null) {
      xyzOpts.tileGrid = new TileGrid(JSON.parse(tileGrid));
    }

    if (layer.proxyMapRequests || hasCustomHeaders || this.gifwMapInstance.authManager) {
      xyzOpts.tileLoadFunction = (
        imageTile: ImageTile,
        src: string,
      ) => {
        if (layer.proxyMapRequests) {
          src = this.gifwMapInstance.createProxyURL(src);
        }
        this.customTileLoader(imageTile, src, layerHeaders);
      };
    }
    const ol_layer = new olLayer.Tile({
      source: new olSource.XYZ(xyzOpts),
      visible: visible,
      className: className,
      maxZoom: layerMaxZoom,
      minZoom: layerMinZoom,
      opacity: opacity,
      extent: extent,
      zIndex:
        this.layerGroupType === LayerGroupType.Basemap
          ? -1000
          : layer.zIndex <= -1000
            ? -999
            : layer.zIndex,
    });
    return ol_layer;
  }

  private createTileWMSLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    maxZoom: number,
    minZoom: number,
    opacity: number,
    extent: Extent,
    layerHeaders: Headers,
    hasCustomHeaders: boolean,
    projection: string) {
    const url = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const tileWMSOpts: TileWMSOptions = {
      url: url,
      attributions:
        layer.layerSource.attribution.renderedAttributionHTML,
      params: layer.layerSource.layerSourceOptions
        .filter((o) => {
          return o.name.toLowerCase() == "params";
        })
        .map((o) => {
          return JSON.parse(o.value);
        })[0],
      crossOrigin: "anonymous",
      projection: projection,
    };

    if (layer.proxyMapRequests || hasCustomHeaders || this.gifwMapInstance.authManager) {
      tileWMSOpts.tileLoadFunction = async (
        imageTile: ImageTile,
        src: string,
      ) => {
        if (layer.proxyMapRequests) {
          src = this.gifwMapInstance.createProxyURL(src);
        }
        this.customTileLoader(imageTile, src, layerHeaders);
      };
    }

    const ol_layer = new olLayer.Tile({
      source: new olSource.TileWMS(tileWMSOpts),
      visible: visible,
      className: className,
      maxZoom: maxZoom,
      minZoom: minZoom,
      opacity: opacity,
      extent: extent,
      zIndex:
        this.layerGroupType === LayerGroupType.Basemap
          ? -1000
          : layer.zIndex <= -1000
            ? -999
            : layer.zIndex,
    });
    return ol_layer;
  }

  private createImageWMSLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    maxZoom: number,
    minZoom: number,
    opacity: number,
    extent: Extent,
    layerHeaders: Headers,
    hasCustomHeaders: boolean,
    projection: string) {
    const url = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const imageWMSOpts: ImageWMSOptions = {
      url: url,
      attributions: layer.layerSource.attribution.renderedAttributionHTML,
      params: layer.layerSource.layerSourceOptions
        .filter((o) => {
          return o.name == "params";
        })
        .map((o) => {
          return JSON.parse(o.value);
        })[0],
      projection: projection,
    };
    if (layer.proxyMapRequests || hasCustomHeaders || this.gifwMapInstance.authManager) {
      /* eslint-disable @typescript-eslint/no-explicit-any -- Cannot find suitable type that can be used as is for imageTile */
      imageWMSOpts.imageLoadFunction = (
        imageTile: any,
        src: string,
      ) => {
        if (layer.proxyMapRequests) {
          src = this.gifwMapInstance.createProxyURL(src);
        }
        this.customTileLoader(imageTile, src, layerHeaders);
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
    const ol_layer = new olLayer.Image({
      source: new olSource.ImageWMS(imageWMSOpts),
      visible: visible,
      className: className,
      maxZoom: maxZoom,
      minZoom: minZoom,
      opacity: opacity,
      extent: extent,
      zIndex:
        this.layerGroupType === LayerGroupType.Basemap
          ? -1000
          : layer.zIndex <= -1000
            ? -999
            : layer.zIndex,
    });

    return ol_layer;
  }

  private async createOGCVectorTileLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    maxZoom: number,
    minZoom: number,
    opacity: number,
    extent: Extent,
    projection: string) {

    // Extract headers and check if we need custom loading
    const layerHeaders = extractCustomHeadersFromLayerSource(layer.layerSource);
    let hasCustomHeaders = false;
    layerHeaders.forEach(() => {
      hasCustomHeaders = true;
    });

    let tileGrid;
    const tileGridOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "tilegrid");
    if (tileGridOpt !== null) {
      if (tileGridOpt.indexOf('http') === 0) {
        const externalTileMatrix = await fetch(tileGridOpt).then(resp => resp.json());
        tileGrid = new TileGrid({
          resolutions: (externalTileMatrix as TileMatrixSet).tileMatrices.map(({ cellSize }) => cellSize),
          origin: externalTileMatrix.tileMatrices[0].pointOfOrigin,
          tileSize: [externalTileMatrix.tileMatrices[0].tileHeight, externalTileMatrix.tileMatrices[0].tileWidth]
        });
      } else {
        tileGrid = new TileGrid(JSON.parse(tileGridOpt));
      }
    }

    // Define the vector tile layer.
    const formatMvt = new MVT();
    formatMvt.supportedMediaTypes.push('application/octet-stream');

    const vectorSource = new olSource.OGCVectorTile({
      url: getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url"),
      format: formatMvt,
      projection: projection,
      attributions: layer.layerSource.attribution.renderedAttributionHTML,
    });

    // Add custom tile load function if needed
    if (layer.proxyMapRequests || hasCustomHeaders || this.gifwMapInstance.authManager) {
      vectorSource.setTileLoadFunction((tile, url) => {
        this.customVectorTileLoader(tile, url, layer, layerHeaders);
      });
    }

    const vectorTileLayer = new olLayer.VectorTile({
      source: vectorSource,
      declutter: true,
      visible: visible,
      className: className,
      maxZoom: maxZoom,
      minZoom: minZoom,
      opacity: opacity,
      extent: extent,
      zIndex:
        this.layerGroupType === LayerGroupType.Basemap
          ? -1000
          : layer.zIndex <= -1000
            ? -999
            : layer.zIndex,
    });

    // Apply style from options
    const styleOpts = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
    if (styleOpts !== null) {
      olMapboxApplyStyle(
        vectorTileLayer,
        styleOpts,
        { updateSource: false },
        { styleUrl: null },
        tileGrid?.getResolutions()
      );
    }

    return vectorTileLayer;
  }

  private async createVectorTileLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    maxZoom: number,
    minZoom: number,
    opacity: number,
    extent: Extent,
    projection: string) {

    const vectorTileSourceOpts:VectorTileOptions  = {
      format: new MVT(),
      projection: projection,
      attributions: layer.layerSource.attribution.renderedAttributionHTML,
    }

    const layerHeaders = extractCustomHeadersFromLayerSource(layer.layerSource);
    let hasCustomHeaders = false;
    layerHeaders.forEach(() => {
      hasCustomHeaders = true;
    });

    const serviceUrl = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const tmsRegexMatch = new RegExp("{(z|-?y|x)}");
    if (serviceUrl.match(tmsRegexMatch) !== null) {
      //we have a tile URL
      vectorTileSourceOpts.url = serviceUrl;

      // Add custom tile load function if needed
      if (layer.proxyMapRequests || hasCustomHeaders || this.gifwMapInstance.authManager) {
        vectorTileSourceOpts.tileLoadFunction = (tile, url) => {
          this.customVectorTileLoader(tile, url, layer, layerHeaders);
        };
      }

      let tileGrid;
      const tileGridOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "tilegrid");
      if (tileGridOpt !== null) {
        if (tileGridOpt.indexOf('http') === 0) {
          const externalTileMatrix = await fetch(tileGridOpt).then(resp => resp.json());
          tileGrid = new TileGrid({
            resolutions: (externalTileMatrix as TileMatrixSet).tileMatrices.map(({ cellSize }) => cellSize),
            origin: externalTileMatrix.tileMatrices[0].pointOfOrigin,
            tileSize: [externalTileMatrix.tileMatrices[0].tileHeight, externalTileMatrix.tileMatrices[0].tileWidth]
          });
        } else {
          tileGrid = new TileGrid(JSON.parse(tileGridOpt));
        }
        vectorTileSourceOpts.tileGrid = tileGrid;
      }
    } else {
      //we have a service metadata URL
      // Get the service metadata.
      const service = await fetch(serviceUrl).then(response => response.json());

      // Read the tile grid dimensions from the service metadata.
      const serviceExtent = [service.fullExtent.xmin, service.fullExtent.ymin, service.fullExtent.xmax, service.fullExtent.ymax];
      const origin = [service.tileInfo.origin.x, service.tileInfo.origin.y];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolutions = service.tileInfo.lods.map((l: { resolution: any; }) => l.resolution).slice(0, 16);
      const tileSize = service.tileInfo.rows;
      const tiles = service.tiles[0];

      // Set the grid pattern options for the vector tile service.
      const tileGrid = new TileGrid({
        extent: serviceExtent,
        origin: origin,
        resolutions: resolutions,
        tileSize: tileSize
      });
      vectorTileSourceOpts.tileGrid = tileGrid;
      vectorTileSourceOpts.url = tiles;
      // Add custom tile load function if needed
      if (layer.proxyMapRequests || hasCustomHeaders || this.gifwMapInstance.authManager) {
        vectorTileSourceOpts.tileLoadFunction = (tile, url) => {
          this.customVectorTileLoader(tile, url, layer, layerHeaders);
        };
      }
    }
    

    // Define the vector tile layer.

    const vectorTileLayer = new olLayer.VectorTile({
      declutter: true,
      visible: visible,
      className: className,
      maxZoom: maxZoom,
      minZoom: minZoom,
      opacity: opacity,
      extent: extent,
      zIndex:
        this.layerGroupType === LayerGroupType.Basemap
          ? -1000
          : layer.zIndex <= -1000
            ? -999
            : layer.zIndex,
    });
    //get style from options
    const styleOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
    if (styleOpt !== null) {
      olMapboxApplyStyle(vectorTileLayer, styleOpt, '', '', vectorTileSourceOpts.tileGrid?.getResolutions()).then(() => {
        vectorTileLayer.setSource(
          new olSource.VectorTile(vectorTileSourceOpts)
        )
      })
    } else {
      vectorTileLayer.setSource(
        new olSource.VectorTile(vectorTileSourceOpts)
      )
    }

    return vectorTileLayer;
  }

  private async createVectorLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    maxZoom: number,
    minZoom: number,
    opacity: number,
    extent: Extent,
    projection: string) {
    const sourceUrlOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const styleOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
    const formatOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "format") || 'application/json';
    const loadingStrategyOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "loadingStrategy");
    const urlType = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "type") || 'wfs'; //default to WFS unless overriden
    const format: GeoJSON | GML32 | GML3 | GML2 | KML = getOpenLayersFormatFromOGCFormat(formatOpt);
    let loadingStrategy = bboxStrategy;
    if (loadingStrategyOpt === "all" || urlType !== 'wfs') {
      loadingStrategy = allStrategy;
    }
    let vector: olLayer.Vector | olLayer.VectorImage;

    if (layer.layerSource.layerSourceType.name === 'Vector') {
      vector = new olLayer.Vector({className: className});
    } else {
      vector = new olLayer.VectorImage({ className: className });
    }

    let url: string | FeatureUrlFunction = sourceUrlOpt;
    let baseUrl = sourceUrlOpt;
    if (urlType === 'wfs') {
      baseUrl = createWFSFeatureRequestFromLayer(layer);
    }
    url = baseUrl;

    const layerHeaders = extractCustomHeadersFromLayerSource(layer.layerSource);
    let hasCustomHeaders = false;
    layerHeaders.forEach(() => {
      hasCustomHeaders = true;
    });

    const vectorSource = new olSource.Vector({
      format: format,
      url: url,
      strategy: loadingStrategy,
      attributions: layer.layerSource.attribution.renderedAttributionHTML,
    });

    // Custom loader if we need authentication or custom headers
    if (layer.proxyMapRequests || hasCustomHeaders || this.gifwMapInstance.authManager) {
      vectorSource.setLoader((extent, resolution, proj) => {
        let url = baseUrl;
        if (loadingStrategy === bboxStrategy) {
          const projCode = typeof proj === 'string' ? proj : proj.getCode();
          url = `${baseUrl}&srsname=${projCode}&bbox=${extent.join(',')},${projCode}`;
        }

        this.customVectorLoader(
          url,
          format,
          extent,
          resolution,
          proj,
          features => vectorSource.addFeatures(features),
          () => vectorSource.removeLoadedExtent(extent),
          layer,
          layerHeaders
        );
      });
    } else {
      // Standard loader
      let url: string | FeatureUrlFunction = baseUrl;
      if (loadingStrategy === bboxStrategy) {
        url = (extent) => {
          if (projection !== `EPSG:${this.gifwMapInstance.olMap.getView().getProjection().getCode()}`) {
            extent = transformExtent(extent, this.gifwMapInstance.olMap.getView().getProjection(), projection);
          }
          return `${baseUrl}&srsname=${projection}&bbox=${extent.join(',')},${projection}`;
        }
      }
      vectorSource.setUrl(url);
    }

    vector.setProperties({
      source: vectorSource,
      visible: visible,
      maxZoom: maxZoom,
      minZoom: minZoom,
      opacity: opacity,
      extent: extent,
      projection: projection,
      zIndex:
        this.layerGroupType === LayerGroupType.Basemap
          ? -1000
          : layer.zIndex <= -1000
            ? -999
            : layer.zIndex,
    })
      
    try {
      const parser = new OpenLayersParser();
      let styleJson = styleOpt;
      if (styleOpt) {
        if (styleOpt.startsWith('https://')) {
          //we need to fetch the style first
          const resp = await fetch(styleOpt);
          if (resp.ok) {
            styleJson = await resp.text();
          } else {
            //err
            throw new DOMException("Could not fetch style");
          }
        }
        const jsonStyle = JSON.parse(styleJson);
        if (jsonStyle !== null) {
          parser
            .writeStyle(jsonStyle)
            .then(({ output: olStyle }) => vector.setStyle(olStyle));
        } else {
          vector.setStyle();
        }
      }
    } catch (ex) {
      console.warn('Style could not be set on layer', ex);
      vector.setStyle();
    }

    return vector;
  }

  async customVectorLoader(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    format: any,
    extent: Extent | undefined,
    resolution: number | undefined,
    projection: string | olProj.Projection,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    success: (features: any[]) => void,
    failure: () => void,
    layer: Layer,
    layerHeaders: Headers
  ) {
    try {
      if (layer.proxyMapRequests) {
        url = this.gifwMapInstance.createProxyURL(url);
      }
      this.gifwMapInstance.authManager.applyAuthenticationToRequestHeaders(url, layerHeaders);

      const response = await fetch(url, {
        headers: layerHeaders,
        mode: "cors",
      });

      if (response.ok) {
        let features = [];
        let data;
        const type = format.getType();
        if (type == 'text' || type == 'json' || type =='xml') {
          data = await response.text();
        } else if (type == 'arraybuffer') {
          data = await response.arrayBuffer();
        }

        if (data) {
          features = format.readFeatures(data, {
            extent: extent,
            featureProjection: typeof projection === 'string' ? projection : projection.getCode()
          })
          success(features);
        } else {
          failure();
        }
      } else {
        console.warn(`Vector request failed with status: ${response.status}`);
        failure();
      }
    } catch (error) {
      console.error("Error loading vector data:", error);
      failure();
    }
  }

  async customVectorTileLoader(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tile: any,  // Using any as the exact VectorTile type is not imported
    src: string,
    layer: Layer,
    layerHeaders: Headers
  ) {
    try {
      if (layer.proxyMapRequests) {
        src = this.gifwMapInstance.createProxyURL(src);
      }
      this.gifwMapInstance.authManager.applyAuthenticationToRequestHeaders(src, layerHeaders);

      const response = await fetch(src, {
        headers: layerHeaders,
        mode: "cors",
      });

      if (response.ok) {
        // Get the tile's format
        const format = tile.getFormat();
        if (!format) {
          console.error("Vector tile format is null");
          tile.setState(3); // Error state
          return;
        }

        // Process the response based on content type
        const contentType = response.headers.get('content-type');
        try {
          let data;
          if (contentType && contentType.includes('json') && !contentType.includes('octet-stream')) {
            data = await response.json();
          } else {
            data = await response.arrayBuffer();
          }

          // Important: Don't use setLoader again, just process directly
          const extent = tile.extent;
          const projection = tile.projection;

          // Read the features
          const features = format.readFeatures(data, {
            extent: extent,
            featureProjection: projection
          });

          // Set features on the tile
          tile.setFeatures(features || []);
          tile.setState(2); // Loaded state
        } catch (parseError) {
          console.error("Error parsing vector tile:", parseError, "Content-Type:", contentType);
          tile.setState(3); // Error state
        }
      } else {
        console.warn(`Vector tile request failed with status: ${response.status}`);
        tile.setState(3); // Error state
      }
    } catch (error) {
      console.error("Error loading vector tile:", error);
      tile.setState(3); // Error state
    }
  }

}