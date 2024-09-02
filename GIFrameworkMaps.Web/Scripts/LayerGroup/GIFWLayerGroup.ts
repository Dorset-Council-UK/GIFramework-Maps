﻿import { ImageTile, View as olView } from "ol";
import { applyStyle as olMapboxApplyStyle } from 'ol-mapbox-style';
import { Extent, applyTransform, containsExtent } from "ol/extent";
import { GeoJSON, KML, MVT } from "ol/format";
import GML2 from "ol/format/GML2";
import GML3 from "ol/format/GML3";
import GML32 from "ol/format/GML32";
import * as olLayer from "ol/layer";
import BaseLayer from "ol/layer/Base";
import { bbox as bboxStrategy, all as allStrategy } from 'ol/loadingstrategy';
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
import { GIFWMap } from "../Map";
import { Mapping as MappingUtil } from "../Util";
import { LayerGroup } from "./LayerGroup";
import OpenLayersParser from "geostyler-openlayers-parser";
import { TileMatrixSet } from "../Interfaces/OGCMetadata/TileMatrixSet"
import { FeatureUrlFunction } from "ol/featureloader";

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
        let ol_layer;
        /*define reused attributes*/
        const className = `${this.layerGroupType === LayerGroupType.Basemap
          ? "basemapLayer"
          : "layer"
          }-${layer.id}`;
        const visible = layer.isDefault !== undefined ? layer.isDefault : false;
        const minZoom = layer.minZoom ? layer.minZoom - 1 : 0;
        const maxZoom = layer.maxZoom ? layer.maxZoom : 100;
        const opacity =
          (layer.defaultOpacity !== undefined ? layer.defaultOpacity : 100) /
          100;
        let projection = viewProj;
        let hasCustomHeaders = false;
        const layerHeaders = MappingUtil.extractCustomHeadersFromLayerSource(
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
          projection = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "projection");
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
          ol_layer = this.createXYZLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);
        } else if (layer.layerSource.layerSourceType.name === 'TileWMS') {
          ol_layer = this.createTileWMSLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection)
        } else if (layer.layerSource.layerSourceType.name === 'ImageWMS') {
          ol_layer = this.createImageWMSLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);
        } else if (layer.layerSource.layerSourceType.name === "Vector" || layer.layerSource.layerSourceType.name === "VectorImage") {
          ol_layer = this.createVectorLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, projection);
        } else if (layer.layerSource.layerSourceType.name === "VectorTile") {
          ol_layer = await this.createVectorTileLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, projection);
        } else if (layer.layerSource.layerSourceType.name === 'OGCVectorTile') {
          ol_layer = await this.createOGCVectorTileLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, projection);
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
            if (
              (
                ol_layer.getSource() as olSource.TileWMS | olSource.ImageWMS
              ).getParams().CQL_FILTER
            ) {
              ol_layer.setProperties({
                "gifw-default-filter": (
                  ol_layer.getSource() as olSource.TileWMS | olSource.ImageWMS
                ).getParams().CQL_FILTER,
              });
            }
          }
        }
        ol_layers.push(ol_layer);
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
    layerHeaders: Headers,
  ) {
    try {
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
    } catch (e) {
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

  addLayerToGroup(
    layer: Layer,
    ol_layer: olLayer.Layer<olSource.Source, LayerRenderer<olLayer.Layer>>,
  ): void {
    this.layers.push(layer);
    const newLayerGroup = this.olLayerGroup.getLayers();
    newLayerGroup.push(ol_layer);
    this.olLayerGroup.setLayers(newLayerGroup);
    this.addChangeEventsForLayer(ol_layer);
  }

  private createXYZLayer(
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
    const xyzOpts: XYZOptions = {
      url: MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url"),
      attributions: layer.layerSource.attribution.renderedAttributionHTML,
      crossOrigin: "anonymous",
      projection: projection,
    };

    const tileGrid = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "tilegrid");
    if (tileGrid !== null) {
      xyzOpts.tileGrid = new TileGrid(JSON.parse(tileGrid));
    }

    if (layer.proxyMapRequests || hasCustomHeaders) {
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
    const tileWMSOpts: TileWMSOptions = {
      url: MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url"),
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

    if (layer.proxyMapRequests || hasCustomHeaders) {
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

    const imageWMSOpts: ImageWMSOptions = {
      url: MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url"),
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
    if (layer.proxyMapRequests || hasCustomHeaders) {
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


    let tileGrid;
    const tileGridOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "tilegrid");
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

    const vectorTileLayer = new olLayer.VectorTile({
      source: new olSource.OGCVectorTile({
        url: MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url"),
        format: formatMvt,
        projection: projection,
        attributions: layer.layerSource.attribution.renderedAttributionHTML,
      }),
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
    const styleOpts = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
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

    const serviceUrl = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const tmsRegexMatch = new RegExp("{(z|-?y|x)}");
    if (serviceUrl.match(tmsRegexMatch) !== null) {
      //we have a tile URL
      vectorTileSourceOpts.url = serviceUrl;
      let tileGrid;
      const tileGridOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "tilegrid");
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
    const styleOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
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

  private createVectorLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    maxZoom: number,
    minZoom: number,
    opacity: number,
    extent: Extent,
    projection: string) {
    const sourceUrlOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
    const styleOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
    const formatOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "format") || 'application/json';
    const loadingStrategyOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "loadingStrategy");
    const urlType = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "type") || 'wfs'; //default to WFS unless overriden
    const format: GeoJSON | GML32 | GML3 | GML2 | KML = MappingUtil.getOpenLayersFormatFromOGCFormat(formatOpt);
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
      baseUrl = MappingUtil.createWFSFeatureRequestFromLayer(layer);
    }
    url = baseUrl;
    if (loadingStrategy === bboxStrategy) {
      url = (extent) => {
        if (projection !== `EPSG:${this.gifwMapInstance.olMap.getView().getProjection().getCode()}`) {
          extent = transformExtent(extent, this.gifwMapInstance.olMap.getView().getProjection(), projection);
        }
        return (
          `${baseUrl}&srsname=${projection}&` +
          `bbox=${extent.join(',')},${projection}`
        );
      }
    }
    const vectorSource = new olSource.Vector({
      format: format,
      url: url,
      strategy: loadingStrategy,
    });
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
      const jsonStyle = JSON.parse(styleOpt);
      if (jsonStyle !== null) {
        parser
          .writeStyle(jsonStyle)
          .then(({ output: olStyle }) => vector.setStyle(olStyle));
      } else {
        vector.setStyle();
      }
    } catch (ex) {
      console.warn('Style could not be set on layer', ex);
      vector.setStyle();
    }

    return vector;
  }
}