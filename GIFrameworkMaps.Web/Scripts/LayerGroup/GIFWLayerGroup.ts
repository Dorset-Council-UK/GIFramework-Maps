import { GIFWMap } from "../Map";
import { ImageTile, View as olView } from "ol";
import * as olLayer from "ol/layer";
import * as olSource from "ol/source";
import { Layer } from "../Interfaces/Layer";
import { Options as ImageWMSOptions } from "ol/source/ImageWMS";
import { Options as TileWMSOptions } from "ol/source/TileWMS";
import { Options as XYZOptions } from "ol/source/XYZ";
import { Extent } from "ol/extent";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { LayerGroup } from "./LayerGroup";
import TileGrid from "ol/tilegrid/TileGrid";
import BaseLayer from "ol/layer/Base";
import {Mapping as MappingUtil } from "../Util"

export class GIFWLayerGroup implements LayerGroup {
    layers: Layer[];
    gifwMapInstance: GIFWMap;
    olLayerGroup: olLayer.Group;
    layerGroupType: LayerGroupType;

    constructor(layers: Layer[], gifwMapInstance: GIFWMap, layerGroupType: LayerGroupType) {
        this.layers = layers;
        this.gifwMapInstance = gifwMapInstance;
        this.layerGroupType = layerGroupType;

        this.olLayerGroup = this.createLayersGroup();
        this.addChangeEvents();
    }

    /**
    * Creates a 'group' of layers (overlay or basemap) for use in OpenLayers
    *
    * @returns olLayer.Group
    *
    */
    createLayersGroup(): olLayer.Group {
        const ol_layers: Array<olLayer.Tile<olSource.XYZ> | olLayer.Tile<olSource.TileWMS> | olLayer.Image<olSource.ImageWMS>> = [];
        const viewProj = 'EPSG:3857';
        if (this.layers !== null) {
            this.layers.forEach((layer) => {
                //let opts: Record<string, any> = {};
                let ol_layer;
                /*define reused attributes*/
                const className = `${this.layerGroupType === LayerGroupType.Basemap ? "basemapLayer" : "layer"}-${layer.id}`;
                const visible = (layer.isDefault !== undefined ? layer.isDefault : false);
                const minZoom = layer.minZoom ? (layer.minZoom - 1) : 0;
                const maxZoom = layer.maxZoom ? layer.maxZoom : 100;
                const opacity = (layer.defaultOpacity !== undefined ? layer.defaultOpacity : 100) / 100;
                let projection = viewProj;
                let hasCustomHeaders = false;
                const layerHeaders = MappingUtil.extractCustomHeadersFromLayerSource(layer.layerSource);
                //this is a bit of a nasty way of checking for existence of headers
                layerHeaders.forEach(() => {
                    hasCustomHeaders = true;
                })
                if (layer.layerSource.layerSourceOptions.some(l => l.name.toLowerCase() === 'projection')) {
                    projection = layer.layerSource.layerSourceOptions.filter(l => l.name.toLowerCase() === 'projection').map(p => { return p.value })[0];
                }
                let extent: Extent;
                if (layer.bound) {
                    extent = [layer.bound.bottomLeftX, layer.bound.bottomLeftY, layer.bound.topRightX, layer.bound.topRightY];
                }
                switch (layer.layerSource.layerSourceType.name) {
                    
                    case "XYZ": {
                        const xyzOpts: XYZOptions = {
                            url: layer.layerSource.layerSourceOptions.filter(o => o.name.toLowerCase() === "url")[0].value,
                            attributions: layer.layerSource.attribution.renderedAttributionHTML,
                            crossOrigin: 'anonymous',
                            projection: projection
                        }

                        const tileGrid = layer.layerSource.layerSourceOptions.filter(o => o.name.toLowerCase() === 'tilegrid');
                        if (tileGrid.length !== 0) {
                            xyzOpts.tileGrid = new TileGrid(JSON.parse(tileGrid[0].value));
                        }

                        if (layer.proxyMapRequests || hasCustomHeaders) {
                            xyzOpts.tileLoadFunction = (imageTile: ImageTile, src: string) => {
                                if (layer.proxyMapRequests) {
                                    src = this.gifwMapInstance.createProxyURL(src);
                                }
                                this.customTileLoader(imageTile, src, layerHeaders);
                            };
                        }
                        ol_layer = new olLayer.Tile({
                            source: new olSource.XYZ(xyzOpts),
                            visible: visible,
                            className: className,
                            maxZoom: maxZoom,
                            minZoom: minZoom,
                            opacity: opacity,
                            extent: extent,
                            zIndex: (this.layerGroupType === LayerGroupType.Basemap ? -1000 : (layer.zIndex <= -1000 ? -999 : layer.zIndex))
                        });

                        break;
                    }
                    case "TileWMS": {
                        /*TODO THIS ISN'T NICE AT ALL*/
                        const tileWMSOpts: TileWMSOptions = {
                            url: layer.layerSource.layerSourceOptions.filter((o) => {
                                return o.name.toLowerCase() == 'url';
                            }).map((o) => {
                                return o.value;
                            })[0],
                            attributions: layer.layerSource.attribution.renderedAttributionHTML,
                            params: layer.layerSource.layerSourceOptions.filter((o) => {
                                return o.name.toLowerCase() == 'params';
                            }).map((o) => {
                                return JSON.parse(o.value);
                            })[0],
                            crossOrigin: 'anonymous',
                            projection: projection
                        };

                        if (layer.proxyMapRequests || hasCustomHeaders) {
                            tileWMSOpts.tileLoadFunction = async (imageTile: ImageTile, src: string) => {
                                if (layer.proxyMapRequests) {
                                    src = this.gifwMapInstance.createProxyURL(src);
                                }
                                this.customTileLoader(imageTile, src, layerHeaders);
                            };
                        }

                        ol_layer = new olLayer.Tile({
                            source: new olSource.TileWMS(tileWMSOpts),
                            visible: visible,
                            className: className,
                            maxZoom: maxZoom,
                            minZoom: minZoom,
                            opacity: opacity,
                            extent: extent,
                            zIndex: (this.layerGroupType === LayerGroupType.Basemap ? -1000 : (layer.zIndex <= -1000 ? -999 : layer.zIndex))
                        });
                        break;
                    }
                    case "ImageWMS": {
                        const imageWMSOpts: ImageWMSOptions = {
                            url: layer.layerSource.layerSourceOptions.filter((o) => {
                                return o.name == 'url';
                            }).map((o) => {
                                return o.value;
                            })[0],
                            attributions: layer.layerSource.attribution.renderedAttributionHTML,
                            params: layer.layerSource.layerSourceOptions.filter((o) => {
                                return o.name == 'params';
                            }).map((o) => {
                                return JSON.parse(o.value);
                            })[0],
                            projection: projection
                        };
                        if (layer.proxyMapRequests || hasCustomHeaders) {
                            imageWMSOpts.imageLoadFunction = (imageTile: any, src: string) => {
                                if (layer.proxyMapRequests) {
                                    src = this.gifwMapInstance.createProxyURL(src);
                                }
                                this.customTileLoader(imageTile, src, layerHeaders);
                            };
                        }
                        ol_layer = new olLayer.Image({
                            source: new olSource.ImageWMS(imageWMSOpts),
                            visible: visible,
                            className: className,
                            maxZoom: maxZoom,
                            minZoom: minZoom,
                            opacity: opacity,
                            extent: extent,
                            zIndex: (this.layerGroupType === LayerGroupType.Basemap ? -1000 : (layer.zIndex <= -1000 ? -999 : layer.zIndex))
                        });
                        break;
                    }
                }
                if (layer.isDefault) {
                    ol_layer.setProperties({ "hasBeenOpened": true });
                }
                
                ol_layer.setProperties({ "layerId": layer.id });
                ol_layer.setProperties({ "gifw-queryable": layer.queryable });
                ol_layer.setProperties({ "gifw-proxy-meta-request": layer.proxyMetaRequests });
                ol_layer.setProperties({ "name": layer.name });
                ol_layer.setProperties({ "saturation": layer.defaultSaturation });
                ol_layer.setProperties({ "layerGroupType": this.layerGroupType })
                if (layer.filterable && !layer.defaultFilterEditable) {
                    if (layer.layerSource.layerSourceType.name === "TileWMS" || layer.layerSource.layerSourceType.name === "ImageWMS") {
                        if ((ol_layer.getSource() as olSource.TileWMS | olSource.ImageWMS).getParams().CQL_FILTER) {
                            ol_layer.setProperties({ "gifw-default-filter": (ol_layer.getSource() as olSource.TileWMS | olSource.ImageWMS).getParams().CQL_FILTER })
                        }
                    }
                }
                ol_layers.push(ol_layer);
            });

        }
        const layerGroup = new olLayer.Group({
            layers: ol_layers
        });
        layerGroup.setProperties({ "type": this.layerGroupType });
        
        return layerGroup;
    }

    async customTileLoader(imageTile: ImageTile, src: string, layerHeaders: Headers) {
        try {
            const resp = await fetch(src, {
                headers: layerHeaders,
                mode: "cors"
            });
            if (resp.ok) {

                const respBlob = await resp.blob();
                const url = URL.createObjectURL(respBlob);
                const img = imageTile.getImage();
                img.addEventListener('load', () => {
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
        this.olLayerGroup.getLayers().forEach(l => {
            this.addChangeEventsForLayer(l);
        })

    }

    private addChangeEventsForLayer(layer: BaseLayer) {
        layer.on('change:visible', e => {
            document.getElementById(this.gifwMapInstance.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
            //we only want to trigger this when its made visible, not when its hidden
            if (e.oldValue === false) {
                const layerId = layer.get('layerId');
                if (!layer.get('hasBeenOpened')) {
                    if (this.layerGroupType === LayerGroupType.Basemap) {
                        const basemap = this.gifwMapInstance.config.basemaps.filter(b => b.id === layerId)[0];
                        if (basemap !== null && basemap.defaultSaturation !== 100) {
                            //get the default saturation and trigger a postrender once to apply it.
                            this.gifwMapInstance.setInitialSaturationOfBasemap(basemap.defaultSaturation);
                        }
                    }
                }
                layer.set('hasBeenOpened', true);
                if (this.layerGroupType === LayerGroupType.Basemap) {
                    const currentView = this.gifwMapInstance.olMap.getView();
                    this.gifwMapInstance.olMap.setView(new olView({
                        center: currentView.getCenter(),
                        zoom: currentView.getZoom(),
                        rotation: currentView.getRotation(),
                        extent: layer.getExtent(),
                        constrainOnlyCenter: true,
                        maxZoom: layer.getMaxZoom(),
                        minZoom: layer.getMinZoom() + 1 /*Min zoom on the view should be one higher than the layer itself to prevent layer from disappearing at last zoom level*/
                    }));
                }
            }
        });
    }

    addLayerToGroup(layer: Layer, ol_layer: olLayer.Layer<any, any>): void {
        this.layers.push(layer);
        const newLayerGroup = this.olLayerGroup.getLayers();
        newLayerGroup.push(ol_layer);
        this.olLayerGroup.setLayers(newLayerGroup);
        this.addChangeEventsForLayer(ol_layer);
    }
}

