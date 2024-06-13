﻿import { GIFWMap } from "../Map";
import { ImageTile, View as olView } from "ol";
import * as olLayer from "ol/layer";
import * as olSource from "ol/source";
import * as olProj from "ol/proj";
import { Layer } from "../Interfaces/Layer";
import { Options as ImageWMSOptions } from "ol/source/ImageWMS";
import { Options as TileWMSOptions } from "ol/source/TileWMS";
import { Options as XYZOptions } from "ol/source/XYZ";
import { Extent, applyTransform, containsExtent } from "ol/extent";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { LayerGroup } from "./LayerGroup";
import TileGrid from "ol/tilegrid/TileGrid";
import BaseLayer from "ol/layer/Base";
import { Mapping as MappingUtil } from "../Util";
import LayerRenderer from "ol/renderer/Layer";
import { getTransform, transformExtent } from "ol/proj";
import { MVT } from "ol/format";
import {applyStyle as olMapboxApplyStyle} from 'ol-mapbox-style';
import { FeatureLike } from "ol/Feature";

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
      | olLayer.VectorTile<FeatureLike>
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
          projection = layer.layerSource.layerSourceOptions
            .filter((l) => l.name.toLowerCase() === "projection")
            .map((p) => {
              return p.value;
            })[0];
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

        } else if (layer.layerSource.layerSourceType.name === 'OGCVectorTile') {
          ol_layer = await this.createOGCVectorTileLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);
        }

        //switch (layer.layerSource.layerSourceType.name) {
        //  case "XYZ": {
        //    ol_layer = this.createXYZLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);

        //    break;
        //  }
        //  case "TileWMS": {
        //    /*TODO THIS ISN'T NICE AT ALL*/
        //    ol_layer = this.createTileWMSLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection)
        //    break;
        //  }
        //  case "ImageWMS": {
        //    ol_layer = this.createImageWMSLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);

        //    break;
        //  }
        //  case "OGCVectorTile": {

        //    ol_layer = await this.createOGCVectorTileLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, layerHeaders, hasCustomHeaders, projection);

        //    break;
        //  }
        //}

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
      url: layer.layerSource.layerSourceOptions.filter(
        (o) => o.name.toLowerCase() === "url",
      )[0].value,
      attributions:
        layer.layerSource.attribution.renderedAttributionHTML,
      crossOrigin: "anonymous",
      projection: projection,
    };

    const tileGrid = layer.layerSource.layerSourceOptions.filter(
      (o) => o.name.toLowerCase() === "tilegrid",
    );
    if (tileGrid.length !== 0) {
      xyzOpts.tileGrid = new TileGrid(JSON.parse(tileGrid[0].value));
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
      url: layer.layerSource.layerSourceOptions
        .filter((o) => {
          return o.name.toLowerCase() == "url";
        })
        .map((o) => {
          return o.value;
        })[0],
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
      url: layer.layerSource.layerSourceOptions
        .filter((o) => {
          return o.name == "url";
        })
        .map((o) => {
          return o.value;
        })[0],
      attributions:
        layer.layerSource.attribution.renderedAttributionHTML,
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
    layerHeaders: Headers,
    hasCustomHeaders: boolean,
    projection: string) {


    let tileGrid;
    const tileGridOpt = layer.layerSource.layerSourceOptions.filter(
      (o) => o.name.toLowerCase() === "tilegrid",
    );
    if (tileGridOpt.length !== 0) {
      if (tileGridOpt[0].value.indexOf('http') === 0) {
        const externalTileMatrix = await fetch(tileGridOpt[0].value).then(resp => resp.json());
        tileGrid = new TileGrid({
          resolutions: (externalTileMatrix as TileMatrixSet).tileMatrices.map(({ cellSize }) => cellSize),
          origin: externalTileMatrix.tileMatrices[0].pointOfOrigin,
          tileSize: [externalTileMatrix.tileMatrices[0].tileHeight, externalTileMatrix.tileMatrices[0].tileWidth]
        });
      } else {
        tileGrid = new TileGrid(JSON.parse(tileGridOpt[0].value));
      }
    }

    // Define the vector tile layer.
    const formatMvt = new MVT();
    formatMvt.supportedMediaTypes.push('application/octet-stream');

    const vectorTileLayer = new olLayer.VectorTile({
      source: new olSource.OGCVectorTile({
        url: layer.layerSource.layerSourceOptions.filter((o) => {
          return o.name == "url";
        })
          .map((o) => {
            return o.value;
          })[0],
        format: formatMvt,
        projection: projection
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
    const styleOpts = layer.layerSource.layerSourceOptions.filter((o) => {
      return o.name == "style";
    });
    if (styleOpts.length !== 0) {
      olMapboxApplyStyle(
        vectorTileLayer,
        styleOpts[0].value,
        { updateSource: false },
        { styleUrl: null },
        tileGrid?.getResolutions()
      );
    }
    
    return vectorTileLayer;
  }
}


export interface TileMatrixSet {
  title: string
  id: string
  uri: string
  orderedAxes: string[]
  crs: string
  tileMatrices: TileMatrice[]
}

export interface TileMatrice {
  id: string
  scaleDenominator: number
  cellSize: number
  cornerOfOrigin: string
  pointOfOrigin: number[]
  tileWidth: number
  tileHeight: number
  matrixHeight: number
  matrixWidth: number
}
