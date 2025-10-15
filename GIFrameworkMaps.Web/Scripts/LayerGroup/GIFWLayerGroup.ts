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
import { createWFSFeatureRequestFromLayer, extractCustomHeadersFromLayerSource, getLayerSourceOptionValueByName, getOpenLayersFormatFromOGCFormat } from "../Util";
import { LayerGroup } from "./LayerGroup";
import { PMTilesVectorSource } from "ol-pmtiles";

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
        } else if(layer.layerSource.layerSourceType.name === 'PMTiles') {
          ol_layer = await this.createPMTilesLayer(layer, visible, className, maxZoom, minZoom, opacity, extent, projection);
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
        if (layer.refreshInterval && layer.refreshInterval > 0) {
          this.setAutoRefreshInterval(ol_layer, layer.refreshInterval);
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
    maxZoom: number,
    minZoom: number,
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


  private async createPMTilesLayer(
    layer: Layer,
    visible: boolean,
    className: string,
    maxZoom: number,
    minZoom: number,
    opacity: number,
    extent: Extent,
    projection: string) {

    //const vectorTileSourceOpts: VectorTileOptions = {
    //  format: new MVT(),
    //  projection: projection,
    //  attributions: layer.layerSource.attribution.renderedAttributionHTML,
    //}

    //const layerHeaders = extractCustomHeadersFromLayerSource(layer.layerSource);
    //let hasCustomHeaders = false;
    //layerHeaders.forEach(() => {
    //  hasCustomHeaders = true;
    //});

    // Define the vector tile layer.

    //const vectorTileLayer = new olLayer.VectorTile({
    //  declutter: true,
    //  visible: visible,
    //  className: className,
    //  maxZoom: maxZoom,
    //  minZoom: minZoom,
    //  opacity: opacity,
    //  extent: extent,
    //  zIndex:
    //    this.layerGroupType === LayerGroupType.Basemap
    //      ? -1000
    //      : layer.zIndex <= -1000
    //        ? -999
    //        : layer.zIndex,
    //});
    ////get style from options
    //const styleOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
    //if (styleOpt !== null) {
    //  olMapboxApplyStyle(vectorTileLayer, styleOpt, '', '', vectorTileSourceOpts.tileGrid?.getResolutions()).then(() => {
    //    vectorTileLayer.setSource(
    //      new olSource.VectorTile(vectorTileSourceOpts)
    //    )
    //  })
    //} else {
    //  vectorTileLayer.setSource(
    //    new olSource.VectorTile(vectorTileSourceOpts)
    //  )
    //}

    const sourceUrlOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
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
        source: new PMTilesVectorSource({
          url: sourceUrlOpt,
          projection: projection,
          attributions: layer.layerSource.attribution.renderedAttributionHTML,
        }),
    });
    //dark style
    //const style = { "version": 8, "sources": { "protomaps": { "type": "vector", "attribution": "<a href=\"https://github.com/protomaps/basemaps\">Protomaps</a> © <a href=\"https://openstreetmap.org\">OpenStreetMap</a>" } }, "layers": [{ "id": "background", "type": "background", "paint": { "background-color": "#34373d" } }, { "id": "earth", "type": "fill", "filter": ["==", "$type", "Polygon"], "source": "protomaps", "source-layer": "earth", "paint": { "fill-color": "#1f1f1f" } }, { "id": "landcover", "type": "fill", "source": "protomaps", "source-layer": "landcover", "paint": { "fill-color": ["match", ["get", "kind"], "grassland", "rgba(30, 41, 31, 1)", "barren", "rgba(38, 38, 36, 1)", "urban_area", "rgba(28, 28, 28, 1)", "farmland", "rgba(31, 36, 32, 1)", "glacier", "rgba(43, 43, 43, 1)", "scrub", "rgba(34, 36, 30, 1)", "rgba(28, 41, 37, 1)"], "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 1, 7, 0] } }, { "id": "landuse_park", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "national_park", "park", "cemetery", "protected_area", "nature_reserve", "forest", "golf_course", "wood", "nature_reserve", "forest", "scrub", "grassland", "grass", "military", "naval_base", "airfield"], "paint": { "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 11, 1], "fill-color": ["case", ["in", ["get", "kind"], ["literal", ["national_park", "park", "cemetery", "protected_area", "nature_reserve", "forest", "golf_course"]]], "#192a24", ["in", ["get", "kind"], ["literal", ["wood", "nature_reserve", "forest"]]], "#202121", ["in", ["get", "kind"], ["literal", ["scrub", "grassland", "grass"]]], "#222323", ["in", ["get", "kind"], ["literal", ["glacier"]]], "#1c1c1c", ["in", ["get", "kind"], ["literal", ["sand"]]], "#212123", ["in", ["get", "kind"], ["literal", ["military", "naval_base", "airfield"]]], "#222323", "#1f1f1f"] } }, { "id": "landuse_urban_green", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "allotments", "village_green", "playground"], "paint": { "fill-color": "#192a24", "fill-opacity": 0.7 } }, { "id": "landuse_hospital", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["==", "kind", "hospital"], "paint": { "fill-color": "#252424" } }, { "id": "landuse_industrial", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["==", "kind", "industrial"], "paint": { "fill-color": "#222222" } }, { "id": "landuse_school", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "school", "university", "college"], "paint": { "fill-color": "#262323" } }, { "id": "landuse_beach", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "beach"], "paint": { "fill-color": "#28282a" } }, { "id": "landuse_zoo", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "zoo"], "paint": { "fill-color": "#222323" } }, { "id": "landuse_aerodrome", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "aerodrome"], "paint": { "fill-color": "#1e1e1e" } }, { "id": "roads_runway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["==", "kind_detail", "runway"], "paint": { "line-color": "#333333", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 0, 12, 4, 18, 30] } }, { "id": "roads_taxiway", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 13, "filter": ["==", "kind_detail", "taxiway"], "paint": { "line-color": "#333333", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 15, 6] } }, { "id": "landuse_runway", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["any", ["in", "kind", "runway", "taxiway"]], "paint": { "fill-color": "#333333" } }, { "id": "water", "type": "fill", "filter": ["==", "$type", "Polygon"], "source": "protomaps", "source-layer": "water", "paint": { "fill-color": "#31353f" } }, { "id": "water_stream", "type": "line", "source": "protomaps", "source-layer": "water", "minzoom": 14, "filter": ["in", "kind", "stream"], "paint": { "line-color": "#31353f", "line-width": 0.5 } }, { "id": "water_river", "type": "line", "source": "protomaps", "source-layer": "water", "minzoom": 9, "filter": ["in", "kind", "river"], "paint": { "line-color": "#31353f", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1, 18, 12] } }, { "id": "landuse_pedestrian", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "pedestrian", "dam"], "paint": { "fill-color": "#1e1e1e" } }, { "id": "landuse_pier", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["==", "kind", "pier"], "paint": { "fill-color": "#333333" } }, { "id": "roads_tunnels_other_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#141414", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_tunnels_minor_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#141414", "line-dasharray": [3, 2], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1] } }, { "id": "roads_tunnels_link_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["has", "is_link"]], "paint": { "line-color": "#141414", "line-dasharray": [3, 2], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1] } }, { "id": "roads_tunnels_major_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#141414", "line-dasharray": [3, 2], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 0.5, 18, 13], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1] } }, { "id": "roads_tunnels_highway_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#141414", "line-dasharray": [6, 0.5], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1, 20, 15] } }, { "id": "roads_tunnels_other", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#292929", "line-dasharray": [4.5, 0.5], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_tunnels_minor", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#292929", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11] } }, { "id": "roads_tunnels_link", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["has", "is_link"]], "paint": { "line-color": "#292929", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11] } }, { "id": "roads_tunnels_major", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", "kind", "major_road"]], "paint": { "line-color": "#292929", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13] } }, { "id": "roads_tunnels_highway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", ["get", "kind"], "highway"], ["!", ["has", "is_link"]]], "paint": { "line-color": "#292929", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 1.1, 12, 1.6, 15, 5, 18, 15] } }, { "id": "buildings", "type": "fill", "source": "protomaps", "source-layer": "buildings", "filter": ["in", "kind", "building", "building_part"], "paint": { "fill-color": "#111111", "fill-opacity": 0.5 } }, { "id": "roads_pier", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["==", "kind_detail", "pier"], "paint": { "line-color": "#333333", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 0.5, 20, 16] } }, { "id": "roads_minor_service_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 13, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["==", "kind_detail", "service"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 18, 8], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 0.8] } }, { "id": "roads_minor_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["!=", "kind_detail", "service"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1] } }, { "id": "roads_link_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 13, "filter": ["has", "is_link"], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1.5] } }, { "id": "roads_major_casing_late", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1] } }, { "id": "roads_highway_casing_late", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1, 20, 15] } }, { "id": "roads_other", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["in", "kind", "other", "path"], ["!=", "kind_detail", "pier"]], "paint": { "line-color": "#333333", "line-dasharray": [3, 1], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_link", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["has", "is_link"], "paint": { "line-color": "#3d3d3d", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11] } }, { "id": "roads_minor_service", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["==", "kind_detail", "service"]], "paint": { "line-color": "#333333", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 18, 8] } }, { "id": "roads_minor", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["!=", "kind_detail", "service"]], "paint": { "line-color": ["interpolate", ["exponential", 1.6], ["zoom"], 11, "#3d3d3d", 16, "#333333"], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11] } }, { "id": "roads_major_casing_early", "type": "line", "source": "protomaps", "source-layer": "roads", "maxzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 0.5, 18, 13], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1] } }, { "id": "roads_major", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#3d3d3d", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13] } }, { "id": "roads_highway_casing_early", "type": "line", "source": "protomaps", "source-layer": "roads", "maxzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1] } }, { "id": "roads_highway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#474747", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 1.1, 12, 1.6, 15, 5, 18, 15] } }, { "id": "roads_rail", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["==", "kind", "rail"], "paint": { "line-dasharray": [0.3, 0.75], "line-opacity": 0.5, "line-color": "#000000", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 0.15, 18, 9] } }, { "id": "boundaries_country", "type": "line", "source": "protomaps", "source-layer": "boundaries", "filter": ["<=", "kind_detail", 2], "paint": { "line-color": "#5b6374", "line-width": 0.7, "line-dasharray": ["step", ["zoom"], ["literal", [2, 0]], 4, ["literal", [2, 1]]] } }, { "id": "boundaries", "type": "line", "source": "protomaps", "source-layer": "boundaries", "filter": [">", "kind_detail", 2], "paint": { "line-color": "#5b6374", "line-width": 0.4, "line-dasharray": ["step", ["zoom"], ["literal", [2, 0]], 4, ["literal", [2, 1]]] } }, { "id": "roads_bridges_other_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#2b2b2b", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_bridges_link_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["has", "is_link"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1.5] } }, { "id": "roads_bridges_minor_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 0.8] } }, { "id": "roads_bridges_major_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 0.5, 18, 10], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1.5] } }, { "id": "roads_bridges_other", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#333333", "line-dasharray": [2, 1], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_bridges_minor", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#333333", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11] } }, { "id": "roads_bridges_link", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["has", "is_link"]], "paint": { "line-color": "#333333", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11] } }, { "id": "roads_bridges_major", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#3d3d3d", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13] } }, { "id": "roads_bridges_highway_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#1f1f1f", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1, 20, 15] } }, { "id": "roads_bridges_highway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#474747", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 1.1, 12, 1.6, 15, 5, 18, 15] } }, { "id": "address_label", "type": "symbol", "source": "protomaps", "source-layer": "buildings", "minzoom": 18, "filter": ["==", "kind", "address"], "layout": { "symbol-placement": "point", "text-font": ["Noto Sans Italic"], "text-field": ["get", "addr_housenumber"], "text-size": 12 }, "paint": { "text-color": "#525252", "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }, { "id": "water_waterway_label", "type": "symbol", "source": "protomaps", "source-layer": "water", "minzoom": 13, "filter": ["in", "kind", "river", "stream"], "layout": { "symbol-placement": "line", "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 12, "text-letter-spacing": 0.2 }, "paint": { "text-color": "#717784", "text-halo-color": "#31353f", "text-halo-width": 1 } }, { "id": "roads_oneway", "type": "symbol", "source": "protomaps", "source-layer": "roads", "minzoom": 16, "filter": ["==", ["get", "oneway"], "yes"], "layout": { "symbol-placement": "line", "icon-image": "arrow", "icon-rotate": 90, "symbol-spacing": 100 } }, { "id": "roads_labels_minor", "type": "symbol", "source": "protomaps", "source-layer": "roads", "minzoom": 15, "filter": ["in", "kind", "minor_road", "other", "path"], "layout": { "symbol-sort-key": ["get", "min_zoom"], "symbol-placement": "line", "text-font": ["Noto Sans Regular"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 12 }, "paint": { "text-color": "#525252", "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }, { "id": "water_label_ocean", "type": "symbol", "source": "protomaps", "source-layer": "water", "filter": ["in", "kind", "sea", "ocean", "bay", "strait", "fjord"], "layout": { "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 10, 12], "text-letter-spacing": 0.1, "text-max-width": 9, "text-transform": "uppercase" }, "paint": { "text-color": "#717784", "text-halo-width": 1, "text-halo-color": "#31353f" } }, { "id": "earth_label_islands", "type": "symbol", "source": "protomaps", "source-layer": "earth", "filter": ["in", "kind", "island"], "layout": { "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 10, "text-letter-spacing": 0.1, "text-max-width": 8 }, "paint": { "text-color": "#525252", "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }, { "id": "water_label_lakes", "type": "symbol", "source": "protomaps", "source-layer": "water", "filter": ["in", "kind", "lake", "water"], "layout": { "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 6, 12, 10, 12], "text-letter-spacing": 0.1, "text-max-width": 9 }, "paint": { "text-color": "#717784", "text-halo-color": "#31353f", "text-halo-width": 1 } }, { "id": "roads_labels_major", "type": "symbol", "source": "protomaps", "source-layer": "roads", "minzoom": 11, "filter": ["in", "kind", "highway", "major_road"], "layout": { "symbol-sort-key": ["get", "min_zoom"], "symbol-placement": "line", "text-font": ["Noto Sans Regular"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 12 }, "paint": { "text-color": "#666666", "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }, { "id": "pois", "type": "symbol", "source": "protomaps", "source-layer": "pois", "filter": ["all", ["in", ["get", "kind"], ["literal", ["beach", "forest", "marina", "park", "peak", "zoo", "garden", "bench", "aerodrome", "station", "bus_stop", "ferry_terminal", "stadium", "university", "library", "school", "animal", "toilets", "drinking_water"]]], [">=", ["zoom"], ["+", ["get", "min_zoom"], 0]]], "layout": { "icon-image": ["match", ["get", "kind"], "station", "train_station", ["get", "kind"]], "text-font": ["Noto Sans Regular"], "text-justify": "auto", "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": ["interpolate", ["linear"], ["zoom"], 17, 10, 19, 16], "text-max-width": 8, "text-offset": [1.1, 0], "text-variable-anchor": ["left", "right"] }, "paint": { "text-color": ["case", ["in", ["get", "kind"], ["literal", ["beach", "forest", "marina", "park", "peak", "zoo", "garden", "bench"]]], "#30C573", ["in", ["get", "kind"], ["literal", ["aerodrome", "station", "bus_stop", "ferry_terminal"]]], "#2B5CEA", ["in", ["get", "kind"], ["literal", ["stadium", "university", "library", "school", "animal", "toilets", "drinking_water"]]], "#93939F", "#1f1f1f"], "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }, { "id": "places_subplace", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["in", "kind", "neighbourhood", "macrohood"], "layout": { "symbol-sort-key": ["case", ["has", "sort_key"], ["get", "sort_key"], ["get", "min_zoom"]], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-font": ["Noto Sans Regular"], "text-max-width": 7, "text-letter-spacing": 0.1, "text-padding": ["interpolate", ["linear"], ["zoom"], 5, 2, 8, 4, 12, 18, 15, 20], "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 11, 8, 14, 14, 18, 24], "text-transform": "uppercase" }, "paint": { "text-color": "#525252", "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }, { "id": "places_region", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["==", "kind", "region"], "layout": { "symbol-sort-key": ["get", "sort_key"], "text-field": ["step", ["zoom"], ["coalesce", ["get", "ref:en"], ["get", "ref"]], 6, ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 7, 16], "text-radial-offset": 0.2, "text-anchor": "center", "text-transform": "uppercase" }, "paint": { "text-color": "#3d3d3d", "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }, { "id": "places_locality", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["==", "kind", "locality"], "layout": { "icon-image": ["step", ["zoom"], ["case", ["==", ["get", "capital"], "yes"], "capital", "townspot"], 8, ""], "icon-size": 0.7, "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-font": ["case", ["<=", ["get", "min_zoom"], 5], ["literal", ["Noto Sans Medium"]], ["literal", ["Noto Sans Regular"]]], "symbol-sort-key": ["case", ["has", "sort_key"], ["get", "sort_key"], ["get", "min_zoom"]], "text-padding": ["interpolate", ["linear"], ["zoom"], 5, 3, 8, 7, 12, 11], "text-size": ["interpolate", ["linear"], ["zoom"], 2, ["case", ["<", ["get", "population_rank"], 13], 8, [">=", ["get", "population_rank"], 13], 13, 0], 4, ["case", ["<", ["get", "population_rank"], 13], 10, [">=", ["get", "population_rank"], 13], 15, 0], 6, ["case", ["<", ["get", "population_rank"], 12], 11, [">=", ["get", "population_rank"], 12], 17, 0], 8, ["case", ["<", ["get", "population_rank"], 11], 11, [">=", ["get", "population_rank"], 11], 18, 0], 10, ["case", ["<", ["get", "population_rank"], 9], 12, [">=", ["get", "population_rank"], 9], 20, 0], 15, ["case", ["<", ["get", "population_rank"], 8], 12, [">=", ["get", "population_rank"], 8], 22, 0]], "icon-padding": ["interpolate", ["linear"], ["zoom"], 0, 0, 8, 4, 10, 8, 12, 6, 22, 2], "text-justify": "auto", "text-variable-anchor": ["step", ["zoom"], ["literal", ["bottom", "left", "right", "top"]], 8, ["literal", ["center"]]], "text-radial-offset": 0.3 }, "paint": { "text-color": "#7a7a7a", "text-halo-color": "#212121", "text-halo-width": 1 } }, { "id": "places_country", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["==", "kind", "country"], "layout": { "symbol-sort-key": ["case", ["has", "sort_key"], ["get", "sort_key"], ["get", "min_zoom"]], "text-field": ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}], "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 2, ["case", ["<", ["get", "population_rank"], 10], 8, [">=", ["get", "population_rank"], 10], 12, 0], 6, ["case", ["<", ["get", "population_rank"], 8], 10, [">=", ["get", "population_rank"], 8], 18, 0], 8, ["case", ["<", ["get", "population_rank"], 7], 11, [">=", ["get", "population_rank"], 7], 20, 0]], "icon-padding": ["interpolate", ["linear"], ["zoom"], 0, 2, 14, 2, 16, 20, 17, 2, 22, 2], "text-transform": "uppercase" }, "paint": { "text-color": "#5c5c5c", "text-halo-color": "#1f1f1f", "text-halo-width": 1 } }], "sprite": "https://protomaps.github.io/basemaps-assets/sprites/v4/dark", "glyphs": "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf" }
    //light style
    const style = { "version": 8, "sources": { "protomaps": { "type": "vector", "attribution": "<a href=\"https://github.com/protomaps/basemaps\">Protomaps</a> © <a href=\"https://openstreetmap.org\">OpenStreetMap</a>", "url": "pmtiles://https://gistaticprod.blob.core.windows.net/pmtiles/gb_20251014.pmtiles" } }, "layers": [{ "id": "background", "type": "background", "paint": { "background-color": "#cccccc" } }, { "id": "earth", "type": "fill", "filter": ["==", "$type", "Polygon"], "source": "protomaps", "source-layer": "earth", "paint": { "fill-color": "#e2dfda" } }, { "id": "landcover", "type": "fill", "source": "protomaps", "source-layer": "landcover", "paint": { "fill-color": ["match", ["get", "kind"], "grassland", "rgba(210, 239, 207, 1)", "barren", "rgba(255, 243, 215, 1)", "urban_area", "rgba(230, 230, 230, 1)", "farmland", "rgba(216, 239, 210, 1)", "glacier", "rgba(255, 255, 255, 1)", "scrub", "rgba(234, 239, 210, 1)", "rgba(196, 231, 210, 1)"], "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 1, 7, 0] } }, { "id": "landuse_park", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "national_park", "park", "cemetery", "protected_area", "nature_reserve", "forest", "golf_course", "wood", "nature_reserve", "forest", "scrub", "grassland", "grass", "military", "naval_base", "airfield"], "paint": { "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 11, 1], "fill-color": ["case", ["in", ["get", "kind"], ["literal", ["national_park", "park", "cemetery", "protected_area", "nature_reserve", "forest", "golf_course"]]], "#9cd3b4", ["in", ["get", "kind"], ["literal", ["wood", "nature_reserve", "forest"]]], "#a0d9a0", ["in", ["get", "kind"], ["literal", ["scrub", "grassland", "grass"]]], "#99d2bb", ["in", ["get", "kind"], ["literal", ["glacier"]]], "#e7e7e7", ["in", ["get", "kind"], ["literal", ["sand"]]], "#e2e0d7", ["in", ["get", "kind"], ["literal", ["military", "naval_base", "airfield"]]], "#c6dcdc", "#e2dfda"] } }, { "id": "landuse_urban_green", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "allotments", "village_green", "playground"], "paint": { "fill-color": "#9cd3b4", "fill-opacity": 0.7 } }, { "id": "landuse_hospital", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["==", "kind", "hospital"], "paint": { "fill-color": "#e4dad9" } }, { "id": "landuse_industrial", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["==", "kind", "industrial"], "paint": { "fill-color": "#d1dde1" } }, { "id": "landuse_school", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "school", "university", "college"], "paint": { "fill-color": "#e4ded7" } }, { "id": "landuse_beach", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "beach"], "paint": { "fill-color": "#e8e4d0" } }, { "id": "landuse_zoo", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "zoo"], "paint": { "fill-color": "#c6dcdc" } }, { "id": "landuse_aerodrome", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "aerodrome"], "paint": { "fill-color": "#dadbdf" } }, { "id": "roads_runway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["==", "kind_detail", "runway"], "paint": { "line-color": "#e9e9ed", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 0, 12, 4, 18, 30] } }, { "id": "roads_taxiway", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 13, "filter": ["==", "kind_detail", "taxiway"], "paint": { "line-color": "#e9e9ed", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 15, 6] } }, { "id": "landuse_runway", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["any", ["in", "kind", "runway", "taxiway"]], "paint": { "fill-color": "#e9e9ed" } }, { "id": "water", "type": "fill", "filter": ["==", "$type", "Polygon"], "source": "protomaps", "source-layer": "water", "paint": { "fill-color": "#80deea" } }, { "id": "water_stream", "type": "line", "source": "protomaps", "source-layer": "water", "minzoom": 14, "filter": ["in", "kind", "stream"], "paint": { "line-color": "#80deea", "line-width": 0.5 } }, { "id": "water_river", "type": "line", "source": "protomaps", "source-layer": "water", "minzoom": 9, "filter": ["in", "kind", "river"], "paint": { "line-color": "#80deea", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1, 18, 12] } }, { "id": "landuse_pedestrian", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["in", "kind", "pedestrian", "dam"], "paint": { "fill-color": "#e3e0d4" } }, { "id": "landuse_pier", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["==", "kind", "pier"], "paint": { "fill-color": "#e0e0e0" } }, { "id": "roads_tunnels_other_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_tunnels_minor_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#e0e0e0", "line-dasharray": [3, 2], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1] } }, { "id": "roads_tunnels_link_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["has", "is_link"]], "paint": { "line-color": "#e0e0e0", "line-dasharray": [3, 2], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1] } }, { "id": "roads_tunnels_major_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#e0e0e0", "line-dasharray": [3, 2], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 0.5, 18, 13], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1] } }, { "id": "roads_tunnels_highway_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#e0e0e0", "line-dasharray": [6, 0.5], "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1, 20, 15] } }, { "id": "roads_tunnels_other", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#d5d5d5", "line-dasharray": [4.5, 0.5], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_tunnels_minor", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#d5d5d5", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11] } }, { "id": "roads_tunnels_link", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["has", "is_link"]], "paint": { "line-color": "#d5d5d5", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11] } }, { "id": "roads_tunnels_major", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", "kind", "major_road"]], "paint": { "line-color": "#d5d5d5", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13] } }, { "id": "roads_tunnels_highway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_tunnel"], ["==", ["get", "kind"], "highway"], ["!", ["has", "is_link"]]], "paint": { "line-color": "#d5d5d5", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 1.1, 12, 1.6, 15, 5, 18, 15] } }, { "id": "buildings", "type": "fill", "source": "protomaps", "source-layer": "buildings", "filter": ["in", "kind", "building", "building_part"], "paint": { "fill-color": "#cccccc", "fill-opacity": 0.5 } }, { "id": "roads_pier", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["==", "kind_detail", "pier"], "paint": { "line-color": "#e0e0e0", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 0.5, 20, 16] } }, { "id": "roads_minor_service_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 13, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["==", "kind_detail", "service"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 18, 8], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 0.8] } }, { "id": "roads_minor_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["!=", "kind_detail", "service"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1] } }, { "id": "roads_link_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 13, "filter": ["has", "is_link"], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1.5] } }, { "id": "roads_major_casing_late", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1] } }, { "id": "roads_highway_casing_late", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1, 20, 15] } }, { "id": "roads_other", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["in", "kind", "other", "path"], ["!=", "kind_detail", "pier"]], "paint": { "line-color": "#ebebeb", "line-dasharray": [3, 1], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_link", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["has", "is_link"], "paint": { "line-color": "#ffffff", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11] } }, { "id": "roads_minor_service", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["==", "kind_detail", "service"]], "paint": { "line-color": "#ebebeb", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 18, 8] } }, { "id": "roads_minor", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "minor_road"], ["!=", "kind_detail", "service"]], "paint": { "line-color": ["interpolate", ["exponential", 1.6], ["zoom"], 11, "#ebebeb", 16, "#ffffff"], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11] } }, { "id": "roads_major_casing_early", "type": "line", "source": "protomaps", "source-layer": "roads", "maxzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 0.5, 18, 13], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1] } }, { "id": "roads_major", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#ffffff", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13] } }, { "id": "roads_highway_casing_early", "type": "line", "source": "protomaps", "source-layer": "roads", "maxzoom": 12, "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1] } }, { "id": "roads_highway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["!has", "is_tunnel"], ["!has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#ffffff", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 1.1, 12, 1.6, 15, 5, 18, 15] } }, { "id": "roads_rail", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["==", "kind", "rail"], "paint": { "line-dasharray": [0.3, 0.75], "line-opacity": 0.5, "line-color": "#a7b1b3", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 0.15, 18, 9] } }, { "id": "boundaries_country", "type": "line", "source": "protomaps", "source-layer": "boundaries", "filter": ["<=", "kind_detail", 2], "paint": { "line-color": "#adadad", "line-width": 0.7, "line-dasharray": ["step", ["zoom"], ["literal", [2, 0]], 4, ["literal", [2, 1]]] } }, { "id": "boundaries", "type": "line", "source": "protomaps", "source-layer": "boundaries", "filter": [">", "kind_detail", 2], "paint": { "line-color": "#adadad", "line-width": 0.4, "line-dasharray": ["step", ["zoom"], ["literal", [2, 0]], 4, ["literal", [2, 1]]] } }, { "id": "roads_bridges_other_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_bridges_link_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["has", "is_link"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0, 12.5, 1.5] } }, { "id": "roads_bridges_minor_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 0.8] } }, { "id": "roads_bridges_major_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 0.5, 18, 10], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0, 9.5, 1.5] } }, { "id": "roads_bridges_other", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["in", "kind", "other", "path"]], "paint": { "line-color": "#ebebeb", "line-dasharray": [2, 1], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 0, 20, 7] } }, { "id": "roads_bridges_minor", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "minor_road"]], "paint": { "line-color": "#ffffff", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 11, 0, 12.5, 0.5, 15, 2, 18, 11] } }, { "id": "roads_bridges_link", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["has", "is_link"]], "paint": { "line-color": "#ffffff", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0, 13.5, 1, 18, 11] } }, { "id": "roads_bridges_major", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "major_road"]], "paint": { "line-color": "#f5f5f5", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 6, 0, 12, 1.6, 15, 3, 18, 13] } }, { "id": "roads_bridges_highway_casing", "type": "line", "source": "protomaps", "source-layer": "roads", "minzoom": 12, "filter": ["all", ["has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#e0e0e0", "line-gap-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 3.5, 0.5, 18, 15], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 7, 0, 7.5, 1, 20, 15] } }, { "id": "roads_bridges_highway", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["all", ["has", "is_bridge"], ["==", "kind", "highway"], ["!has", "is_link"]], "paint": { "line-color": "#ffffff", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 3, 0, 6, 1.1, 12, 1.6, 15, 5, 18, 15] } }, { "id": "address_label", "type": "symbol", "source": "protomaps", "source-layer": "buildings", "minzoom": 18, "filter": ["==", "kind", "address"], "layout": { "symbol-placement": "point", "text-font": ["Noto Sans Italic"], "text-field": ["get", "addr_housenumber"], "text-size": 12 }, "paint": { "text-color": "#91888b", "text-halo-color": "#ffffff", "text-halo-width": 1 } }, { "id": "water_waterway_label", "type": "symbol", "source": "protomaps", "source-layer": "water", "minzoom": 13, "filter": ["in", "kind", "river", "stream"], "layout": { "symbol-placement": "line", "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 12, "text-letter-spacing": 0.2 }, "paint": { "text-color": "#728dd4", "text-halo-color": "#80deea", "text-halo-width": 1 } }, { "id": "roads_oneway", "type": "symbol", "source": "protomaps", "source-layer": "roads", "minzoom": 16, "filter": ["==", ["get", "oneway"], "yes"], "layout": { "symbol-placement": "line", "icon-image": "arrow", "icon-rotate": 90, "symbol-spacing": 100 } }, { "id": "roads_labels_minor", "type": "symbol", "source": "protomaps", "source-layer": "roads", "minzoom": 15, "filter": ["in", "kind", "minor_road", "other", "path"], "layout": { "symbol-sort-key": ["get", "min_zoom"], "symbol-placement": "line", "text-font": ["Noto Sans Regular"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 12 }, "paint": { "text-color": "#91888b", "text-halo-color": "#ffffff", "text-halo-width": 1 } }, { "id": "water_label_ocean", "type": "symbol", "source": "protomaps", "source-layer": "water", "filter": ["in", "kind", "sea", "ocean", "bay", "strait", "fjord"], "layout": { "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 10, 12], "text-letter-spacing": 0.1, "text-max-width": 9, "text-transform": "uppercase" }, "paint": { "text-color": "#728dd4", "text-halo-width": 1, "text-halo-color": "#80deea" } }, { "id": "earth_label_islands", "type": "symbol", "source": "protomaps", "source-layer": "earth", "filter": ["in", "kind", "island"], "layout": { "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 10, "text-letter-spacing": 0.1, "text-max-width": 8 }, "paint": { "text-color": "#8f8f8f", "text-halo-color": "#e0e0e0", "text-halo-width": 1 } }, { "id": "water_label_lakes", "type": "symbol", "source": "protomaps", "source-layer": "water", "filter": ["in", "kind", "lake", "water"], "layout": { "text-font": ["Noto Sans Italic"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 6, 12, 10, 12], "text-letter-spacing": 0.1, "text-max-width": 9 }, "paint": { "text-color": "#728dd4", "text-halo-color": "#80deea", "text-halo-width": 1 } }, { "id": "roads_labels_major", "type": "symbol", "source": "protomaps", "source-layer": "roads", "minzoom": 11, "filter": ["in", "kind", "highway", "major_road"], "layout": { "symbol-sort-key": ["get", "min_zoom"], "symbol-placement": "line", "text-font": ["Noto Sans Regular"], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": 12 }, "paint": { "text-color": "#938a8d", "text-halo-color": "#ffffff", "text-halo-width": 1 } }, { "id": "pois", "type": "symbol", "source": "protomaps", "source-layer": "pois", "filter": ["all", ["in", ["get", "kind"], ["literal", ["beach", "forest", "marina", "park", "peak", "zoo", "garden", "bench", "aerodrome", "station", "bus_stop", "ferry_terminal", "stadium", "university", "library", "school", "animal", "toilets", "drinking_water"]]], [">=", ["zoom"], ["+", ["get", "min_zoom"], 0]]], "layout": { "icon-image": ["match", ["get", "kind"], "station", "train_station", ["get", "kind"]], "text-font": ["Noto Sans Regular"], "text-justify": "auto", "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-size": ["interpolate", ["linear"], ["zoom"], 17, 10, 19, 16], "text-max-width": 8, "text-offset": [4, 0], "text-variable-anchor": ["left", "right"] }, "paint": { "text-color": ["case", ["in", ["get", "kind"], ["literal", ["beach", "forest", "marina", "park", "peak", "zoo", "garden", "bench"]]], "#20834D", ["in", ["get", "kind"], ["literal", ["aerodrome", "station", "bus_stop", "ferry_terminal"]]], "#315BCF", ["in", ["get", "kind"], ["literal", ["stadium", "university", "library", "school", "animal", "toilets", "drinking_water"]]], "#6A5B8F", "#e2dfda"], "text-halo-color": "#e2dfda", "text-halo-width": 1 } }, { "id": "places_subplace", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["in", "kind", "neighbourhood", "macrohood"], "layout": { "symbol-sort-key": ["case", ["has", "sort_key"], ["get", "sort_key"], ["get", "min_zoom"]], "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-font": ["Noto Sans Regular"], "text-max-width": 7, "text-letter-spacing": 0.1, "text-padding": ["interpolate", ["linear"], ["zoom"], 5, 2, 8, 4, 12, 18, 15, 20], "text-size": ["interpolate", ["exponential", 1.2], ["zoom"], 11, 8, 14, 14, 18, 24], "text-transform": "uppercase" }, "paint": { "text-color": "#8f8f8f", "text-halo-color": "#e0e0e0", "text-halo-width": 1 } }, { "id": "places_region", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["==", "kind", "region"], "layout": { "symbol-sort-key": ["get", "sort_key"], "text-field": ["step", ["zoom"], ["coalesce", ["get", "ref:en"], ["get", "ref"]], 6, ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 7, 16], "text-radial-offset": 0.2, "text-anchor": "center", "text-transform": "uppercase" }, "paint": { "text-color": "#b3b3b3", "text-halo-color": "#e0e0e0", "text-halo-width": 1 } }, { "id": "places_locality", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["==", "kind", "locality"], "layout": { "icon-image": ["step", ["zoom"], ["case", ["==", ["get", "capital"], "yes"], "capital", "townspot"], 8, ""], "icon-size": 0.7, "text-field": ["case", ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["!", ["any", ["has", "name2"], ["has", "pgf:name2"]]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["has", "script"], ["case", ["any", ["is-supported-script", ["get", "name"]], ["has", "pgf:name"]], ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}, "\n", {}, ["case", ["all", ["!", ["has", "name:en"]], ["has", "name:en"], ["!", ["has", "script"]]], "", ["coalesce", ["get", "pgf:name"], ["get", "name"]]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["get", "name:en"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}]], ["all", ["any", ["has", "name"], ["has", "pgf:name"]], ["any", ["has", "name2"], ["has", "pgf:name2"]], ["!", ["any", ["has", "name3"], ["has", "pgf:name3"]]]], ["case", ["all", ["has", "script"], ["has", "script2"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["has", "script2"], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]], ["case", ["all", ["has", "script"], ["has", "script2"], ["has", "script3"]], ["format", ["get", "name:en"], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["case", ["!", ["has", "script"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name"], ["get", "name"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["!", ["has", "script2"]], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name2"], ["get", "name2"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name3"], ["get", "name3"]], { "text-font": ["case", ["==", ["get", "script3"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }], ["format", ["coalesce", ["get", "name:en"], ["get", "pgf:name3"], ["get", "name3"]], {}, "\n", {}, ["coalesce", ["get", "pgf:name"], ["get", "name"]], { "text-font": ["case", ["==", ["get", "script"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }, "\n", {}, ["coalesce", ["get", "pgf:name2"], ["get", "name2"]], { "text-font": ["case", ["==", ["get", "script2"], "Devanagari"], ["literal", ["Noto Sans Devanagari Regular v1"]], ["literal", ["Noto Sans Regular"]]] }]]]], "text-font": ["case", ["<=", ["get", "min_zoom"], 5], ["literal", ["Noto Sans Medium"]], ["literal", ["Noto Sans Regular"]]], "symbol-sort-key": ["case", ["has", "sort_key"], ["get", "sort_key"], ["get", "min_zoom"]], "text-padding": ["interpolate", ["linear"], ["zoom"], 5, 3, 8, 7, 12, 11], "text-size": ["interpolate", ["linear"], ["zoom"], 2, ["case", ["<", ["get", "population_rank"], 13], 8, [">=", ["get", "population_rank"], 13], 13, 0], 4, ["case", ["<", ["get", "population_rank"], 13], 10, [">=", ["get", "population_rank"], 13], 15, 0], 6, ["case", ["<", ["get", "population_rank"], 12], 11, [">=", ["get", "population_rank"], 12], 17, 0], 8, ["case", ["<", ["get", "population_rank"], 11], 11, [">=", ["get", "population_rank"], 11], 18, 0], 10, ["case", ["<", ["get", "population_rank"], 9], 12, [">=", ["get", "population_rank"], 9], 20, 0], 15, ["case", ["<", ["get", "population_rank"], 8], 12, [">=", ["get", "population_rank"], 8], 22, 0]], "icon-padding": ["interpolate", ["linear"], ["zoom"], 0, 0, 8, 4, 10, 8, 12, 6, 22, 2], "text-justify": "auto", "text-variable-anchor": ["step", ["zoom"], ["literal", ["bottom", "left", "right", "top"]], 8, ["literal", ["center"]]], "text-radial-offset": 0.3 }, "paint": { "text-color": "#5c5c5c", "text-halo-color": "#e0e0e0", "text-halo-width": 1 } }, { "id": "places_country", "type": "symbol", "source": "protomaps", "source-layer": "places", "filter": ["==", "kind", "country"], "layout": { "symbol-sort-key": ["case", ["has", "sort_key"], ["get", "sort_key"], ["get", "min_zoom"]], "text-field": ["format", ["coalesce", ["get", "name:en"], ["get", "name:en"]], {}], "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 2, ["case", ["<", ["get", "population_rank"], 10], 8, [">=", ["get", "population_rank"], 10], 12, 0], 6, ["case", ["<", ["get", "population_rank"], 8], 10, [">=", ["get", "population_rank"], 8], 18, 0], 8, ["case", ["<", ["get", "population_rank"], 7], 11, [">=", ["get", "population_rank"], 7], 20, 0]], "icon-padding": ["interpolate", ["linear"], ["zoom"], 0, 2, 14, 2, 16, 20, 17, 2, 22, 2], "text-transform": "uppercase" }, "paint": { "text-color": "#a3a3a3", "text-halo-color": "#e2dfda", "text-halo-width": 1 } }], "sprite": "https://protomaps.github.io/basemaps-assets/sprites/v4/light", "glyphs": "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf" }
    olMapboxApplyStyle(vectorTileLayer, style);
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