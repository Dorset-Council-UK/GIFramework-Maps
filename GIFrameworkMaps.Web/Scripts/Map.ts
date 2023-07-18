import { Feature, Map as olMap, View as olView } from "ol";
import * as olControl from "ol/control";
import * as olProj from "ol/proj";
import * as olLayer from "ol/layer";
import { Extent, containsExtent, containsCoordinate } from "ol/extent";
import * as gifwSidebar from "../Scripts/Sidebar";
import * as gifwSidebarCollection from "../Scripts/SidebarCollection";
import {GIFWMousePositionControl} from "../Scripts/MousePositionControl"
import { ImageWMS, TileWMS, Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Layer } from "./Interfaces/Layer";
import { GIFWPopupOverlay } from "./Popups/PopupOverlay";
import { GIFWLayerGroup } from "./LayerGroup/GIFWLayerGroup";
import { GIFWContextMenu } from "./ContextMenu";
import { GIFWGeolocation } from "./Geolocation";
import Geometry from "ol/geom/Geometry";
import { v4 as uuidv4 } from 'uuid';
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import { NativeLayerGroup } from "./LayerGroup/NativeLayerGroup";
import { LayerGroup } from "./LayerGroup/LayerGroup";
import { Util } from "./Util";
import { KML } from "ol/format";
import { LayerUpload } from "./LayerUpload";
import BaseLayer from "ol/layer/Base";
import RenderFeature from "ol/render/Feature";
import { Measure } from "./Measure";
import Annotate from "./Annotate/Annotate";
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { FeatureQuery } from "./FeatureQuery/FeatureQuery";
import AnnotationStylePanel from "./Panels/AnnotationStylePanel";
import { Search } from "./Search";
import { Streetview } from "./Streetview";
import { VersionViewModel } from "./Interfaces/VersionViewModel";
import { WebLayerService } from "./WebLayerService";
import { BookmarkMenu } from "./BookmarkMenu";

export class GIFWMap {
    id: string;
    config: VersionViewModel;
    layerGroups: LayerGroup[];
    sidebars: gifwSidebar.Sidebar[];
    popupOverlay: GIFWPopupOverlay;
    olMap: olMap;
    customControls: any[] = [];
    constructor(id: string, config:VersionViewModel, sidebars: gifwSidebar.Sidebar[]) {
        this.id = id;
        this.config = config;
        this.sidebars = sidebars;
    }

    /**
     * Initializes the map
     * @returns OpenLayers map reference to the created map
     * */
    public initMap(): olMap {

        /*TODO - THIS IS A NASTY MEGA FUNCTION OF ALMOST 300 LINES OF CODE. SIMPLIFY!!!

        //register projections /*TODO Make this more dynamic, allowing other projections to be loaded*/
        proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs");
        register(proj4);
        //parse permalink params
        let permalinkParams: Record<string, string> = {};
        if (window.location.hash !== '') {
            // try to restore center, zoom-level and rotation from the URL
            permalinkParams = Util.Browser.extractParamsFromHash(window.location.hash);
        }
        // set up controls
        let attribution = new olControl.Attribution({
            collapsible: false,
        });
        let scaleline = new olControl.ScaleLine({
            units: 'metric'
        });
        let rotateControl = new olControl.Rotate({
            autoHide: false,
            tipLabel: 'Reset rotation (Alt-Shift and Drag to rotate)'
        })
        //mouse position controls. TODO - alow DB setting of initial coord system
        let mousePosition = new GIFWMousePositionControl('27700', 0);
        let contextMenu = new GIFWContextMenu(mousePosition);
        //add measure
        let measureControl = new Measure(this);
        // add annotations
        let annotateControl = new Annotate(this);
        // add info click
        let infoControl = new FeatureQuery(this)
        //add geolocation
        let geolocationControl = new GIFWGeolocation(this);

        this.customControls.push(mousePosition, contextMenu, measureControl, annotateControl, infoControl, geolocationControl);
        let controls: olControl.Control[] = [attribution, scaleline, mousePosition.control, contextMenu.control, measureControl, rotateControl, annotateControl, infoControl, geolocationControl];

        //TODO - MESSY!
        var sidebarCollection = new gifwSidebarCollection.SidebarCollection(this.sidebars);
        sidebarCollection.initSidebarCollection();
        sidebarCollection.sidebars.forEach(sb => {
            controls.push(sb.control);
        })

        //define layer groups

        //first, check the permalink and update the default basemap if the
        //permalink dervied one is different from the server provided one
        if (permalinkParams.basemap) {
            const basemapParamParts = permalinkParams.basemap.split('/');
            let overriddenBasemapId = basemapParamParts[0];
            if ((this.config.basemaps.filter(b => b.id == overriddenBasemapId).length !== 0) && basemapParamParts.length === 3 || this.config.basemaps.filter(b => b.id == overriddenBasemapId && !b.isDefault).length !== 0) {
                this.config.basemaps.forEach(b => {
                    if (b.id != overriddenBasemapId) {
                        b.isDefault = false;
                    } else {
                        b.isDefault = true;
                        if (basemapParamParts.length === 3) {
                            b.defaultOpacity = parseInt(basemapParamParts[1]);
                            b.defaultSaturation = parseInt(basemapParamParts[2])
                        }
                    }
                })
            } 
        }
        this.layerGroups = [];
        this.layerGroups.push(new GIFWLayerGroup(this.config.basemaps, this, LayerGroupType.Basemap));

        let permalinkEnabledLayerSettings: string[] = [];
        let permalinkEnabledLayers: string[][] = [];
        if (permalinkParams.layers) {
            permalinkEnabledLayerSettings = permalinkParams.layers.split(',');
            permalinkEnabledLayerSettings.forEach(p => {
                permalinkEnabledLayers.push(p.split("/"));
            })
        }

        let flattenedLayers = this.config.categories.flat();
        let overrideDefaultLayers = false;
        if (permalinkEnabledLayers.length !== 0) {
            overrideDefaultLayers = true;
        }
        let allLayers: Layer[] = [];
        flattenedLayers.forEach(f => {
            f.layers.forEach(l => {
                if (overrideDefaultLayers) {
                    let layerSetting = permalinkEnabledLayers.filter(pel => pel[0] == l.id);
                    if (layerSetting.length === 1) {
                        l.isDefault = true;
                        if (layerSetting[0].length >= 3) {
                            l.defaultOpacity = parseInt(layerSetting[0][1]);
                            l.defaultSaturation = parseInt(layerSetting[0][2]);
                        }
                    } else {
                        l.isDefault = false;
                    }
                }
                allLayers.push(l);
                
            })
        })
        this.layerGroups.push(new GIFWLayerGroup(allLayers, this, LayerGroupType.Overlay));

        let flattenedLayerGroups = this.layerGroups.flat();
        let allLayerGroups: olLayer.Group[] = [];
        flattenedLayerGroups.forEach(f => {
            allLayerGroups.push(f.olLayerGroup);
        })

        //define popups
        let popupEle = document.getElementById('gifw-popup')
        this.popupOverlay = new GIFWPopupOverlay(popupEle);

        //define max extent of view
        let startExtent: number[] = [];
        let startMaxZoom: number = 22;
        let startMinZoom: number = 0;
        let startBasemap = this.config.basemaps.find(b => b.isDefault);
        if (startBasemap !== null) {
            startExtent = [startBasemap.bound.bottomLeftX, startBasemap.bound.bottomLeftY, startBasemap.bound.topRightX, startBasemap.bound.topRightY];
            startMaxZoom = startBasemap.maxZoom;
            startMinZoom = startBasemap.minZoom;
        }

        //get passed in view parameters
        //The zoom and center should always be overwritten by the versions start bounds or the url hash
        let defaultZoom = 10;
        let defaultCenter = [-2.3314, 50.7621];
        let defaultRotation = 0;
        let defaultCRS = 4326;
        let defaultBbox:number[];
        let locationProvidedByURL = false;
        if (permalinkParams) {
            // try to restore center, zoom-level and rotation from the URL
            //first we try the 'map' paramater, which should contain zoom, x, y, rotation and optional EPSG code
            if (permalinkParams.map) {
                const parts = permalinkParams.map.split('/');
                if (parts.length >= 4) {
                    locationProvidedByURL = true;
                    defaultZoom = parseFloat(parts[0]) || defaultZoom;
                    defaultCenter = [parseFloat(parts[1]), parseFloat(parts[2])];
                    defaultRotation = parseFloat(parts[3]) || 0;
                    defaultCRS = parseFloat(parts[4]) || 4326;
                    if (defaultCRS === 4326) {
                        //we display the coords in the friendly format for lat/lon, but these 
                        //need reversing for use as actual coordinates
                        defaultCenter.reverse();
                    }
                }
            }
            //if no map parameter, see if there is a bbox paramater
            else if (permalinkParams.bbox) {
                const parts = permalinkParams.bbox.split('/');
                if (parts.length !== 0) {
                    let bbox = parts[0].split(",");

                    if (bbox.length === 4) {
                        //check the contents are numbers
                        if (bbox.every(c => !isNaN(parseFloat(c)))) {
                            defaultBbox = bbox.map(c => parseFloat(c));
                            locationProvidedByURL = true;
                        }
                    }

                    if (parts.length === 2) {
                        //epsg inlcuded
                        defaultCRS = parseFloat(parts[1]) || 4326;
                    }
                }
            }
        }

        //init map
        let map = new olMap({
            target: this.id,
            layers: allLayerGroups,
            overlays: [this.popupOverlay.overlay],
            controls: olControl.defaults({ attribution: false }).extend(
                controls),
            view: new olView({
                center: olProj.transform(defaultCenter, olProj.get(`EPSG:${defaultCRS}`), olProj.get(`EPSG:3857`)),
                zoom: defaultZoom,
                projection: 'EPSG:3857',
                extent: startExtent,
                constrainOnlyCenter: true,
                maxZoom: startMaxZoom,
                minZoom: startMinZoom,
                rotation: defaultRotation
            }),
            keyboardEventTarget: document /*NOTE: This might cause issue if map is used in embedded contexts*/
        });
        this.olMap = map;

        
        //set starting saturation of basemap (this needs to be done post map init)
        if (startBasemap.defaultSaturation !== 100) {
            this.setInitialSaturationOfBasemap(startBasemap.defaultSaturation)
        }
        //Set starting saturation and style of layers
        if (this.anyOverlaysOn()) {
            let layerGroup = this.getLayerGroupOfType(LayerGroupType.Overlay);
            let layers = layerGroup.olLayerGroup.getLayersArray();
            let switchedOnLayers = layers.filter(l => l.getVisible() === true);

            switchedOnLayers.forEach(l => {
                let layerId = l.get('layerId');
                let layer = this.getLayerConfigById(layerId,[LayerGroupType.Overlay])
                if (layer !== null && layer.defaultSaturation !== 100) {
                    //get the default saturation and trigger a postrender once to apply it.
                    this.setInitialSaturationOfLayer(l as olLayer.Layer<any,any>, layer.defaultSaturation);
                }
                if (overrideDefaultLayers) {
                    let layerSetting = permalinkEnabledLayers.filter(pel => pel[0] == layerId);
                    if (layerSetting.length === 1) {
                        if (layerSetting[0].length === 4) {
                            let permalinkStyleName = layerSetting[0][3];
                            let layerSource = l.getSource();
                            if (layerSource instanceof TileWMS || layerSource instanceof ImageWMS) {
                                let currentStyleName = layerSource.getParams()?.STYLES || "";
                                if (currentStyleName !== permalinkStyleName) {
                                    layerSource.updateParams({ STYLES: permalinkStyleName });
                                }
                            }
                        }
                    }
                }
            })
            

        }
        //set start bounds
        //check paramater defined bbox first, then fall back to default start bound
        if (locationProvidedByURL && defaultBbox) {
            let mapSize = map.getSize();
            let reprojectedExtent = olProj.transformExtent(defaultBbox, `EPSG:${defaultCRS}`, this.olMap.getView().getProjection());
            this.olMap.getView().fit(reprojectedExtent, { size: mapSize });
        }
        if (!locationProvidedByURL) { 
            let bounds: Extent;
            bounds = [this.config.bound.bottomLeftX, this.config.bound.bottomLeftY, this.config.bound.topRightX, this.config.bound.topRightY];
            let mapSize = map.getSize();
        
            map.getView().fit(bounds, { size: mapSize });
        }
        //add attribution size checker and app height variable
        window.addEventListener('resize', () => {
            this.checkAttributionSize(map, attribution);
            this.setAppHeightVariable();
        });
        this.checkAttributionSize(map, attribution);
        this.setAppHeightVariable();

        //add drag and drop
        this.addDragAndDropInteraction();

        //add remote layer adder
        let webLayerService = new WebLayerService(this);
        webLayerService.init();

        //add bookmark control
        if (this.config.isLoggedIn) {
            let bookmarkControl = new BookmarkMenu(this);
            bookmarkControl.init();
        }
        measureControl.init();
        infoControl.init();
        geolocationControl.init();

        let search = new Search('#search-container', this, `${document.location.protocol}//${this.config.appRoot}search/options/${this.config.id}`, `${document.location.protocol}//${this.config.appRoot}search`);

        search.init(permalinkParams);

        if (this.config.googleMapsAPIKey) {
            let streetview = new Streetview(this.config.googleMapsAPIKey);
            streetview.init(contextMenu);
        }

        var annotationStylePanel = new AnnotationStylePanel('#annotation-style-panel');
        var annotationStyleIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#FFFFFF" class="bi bi-brush-fill" viewBox="0 0 16 16">
          <path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.067 6.067 0 0 1-2.373 1.534c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.118 8.118 0 0 1-3.078.132 3.659 3.659 0 0 1-.562-.135 1.382 1.382 0 0 1-.466-.247.714.714 0 0 1-.204-.288.622.622 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 1.746-.896.126.007.243.025.348.048.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04z"/>
        </svg>
    `;
        var annotationStyleSidebar = new gifwSidebar.Sidebar('annotation-style-panel', 'Modify annotation style', 'Change the appearance of your annotations', `data:image/svg+xml; charset=utf8, ${encodeURIComponent(annotationStyleIcon)}`, 3, annotationStylePanel);
        annotationStylePanel.setGIFWMapInstance(this);
        annotationStylePanel.setListeners(annotationStyleSidebar);

        annotateControl.init();

        //add permalink updater
        map.on('moveend', (evt) => {
            document.getElementById(this.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
        })

        document.getElementById(this.id).addEventListener('gifw-update-permalink', () => {
            this.updatePermalinkInURL();
        });


        return map;
    }

    /**
     * Updates the permalink in the browser URL bar and pushes it into the history
     * */
    private updatePermalinkInURL() {
        let permalink = Util.Mapping.generatePermalinkForMap(this);
        let hashParams = Util.Browser.extractParamsFromHash(permalink.substring(permalink.indexOf('#')));

        window.history.replaceState(hashParams, '', permalink);

    }

    /**
     * Adds the Drag and Drop layer upload interaction
     * */
    private addDragAndDropInteraction() {
        new LayerUpload(this, document.getElementById(this.id));
    }

    /**
     * Adds a 'native' layer to the map from the passed in source
     * @param {VectorSource} source The actual source layer
     * @param {string} name The name we want to give to the layer
     * @param style The OpenLayers Style or Style Function to apply to the layer
     * @param {boolean} visible Whether the style is visible or not (defaults to true)
     * @param type The LayerGroupType of this layer, defaults to 'User Native'
     * @param {number} zIndex The z-index to apply to the layer. Defaults to 0
     * @param {boolean} queryable Whether the layer can be queried or not
     * @param {string} layerId A unique ID for the layer. Defaults to a randomly generated GUID
     * @param olLayerOpts Additional options to add to the OpenLayers options
     */
    public addNativeLayerToMap(
        source: VectorSource<any>,
        name: string,
        style?: any,
        visible: boolean = true,
        type = LayerGroupType.UserNative,
        zIndex: number = 0,
        queryable: boolean = true,
        layerId: string = uuidv4(),
        olLayerOpts = {}
    ) {
        let styleFunc = (feature: Feature<Geometry>) => {
            return Util.Style.getDefaultStyleByGeomType(feature.getGeometry().getType(), this.config.theme)
        }
        if (style) {
            styleFunc = style;
        }
        let ol_layer;
        let opts = {
            source: source,
            className: `layer-${layerId}`,
            visible: visible,
            zIndex: zIndex,
            ...olLayerOpts
        }
        if (source instanceof KML) {
            ol_layer = new VectorLayer(opts);
        } else {
            let additionalOpts = { style: styleFunc }
            opts = {...opts,...additionalOpts}
            ol_layer = new VectorLayer(opts);
        }
        
        ol_layer.setProperties({ "hasBeenOpened": visible });
        ol_layer.setProperties({ "layerId": layerId })
        ol_layer.setProperties({ "name": name });
        ol_layer.setProperties({ "gifw-queryable": queryable })
        ol_layer.setProperties({ "gifw-is-user-layer": true })

        let gifwLayer: Layer = {
            id: layerId,
            name: name,
            sortOrder: 0,
            isDefault: false,
            layerSource: undefined,
            bound: undefined,
            minZoom: 0,
            maxZoom: 0,
            zIndex: zIndex,
            defaultOpacity: 0,
            defaultSaturation: 0,
            queryable: queryable,
            infoTemplate: "",
            infoListTitleTemplate: "",
            filterable: false,
            defaultFilterEditable: false,
            removable: (type === LayerGroupType.UserNative),
            proxyMetaRequests: false,
            proxyMapRequests: false
        }

        let layerGroup = this.getLayerGroupOfType(type);
        if (layerGroup == null) {
            layerGroup = new NativeLayerGroup([ol_layer], this, type)
            this.layerGroups.push(layerGroup);
        } else {
            layerGroup.addLayerToGroup(ol_layer);
        }
        let myLayersCategory = this.config.categories.filter(c => c.id === 0);
        if (myLayersCategory.length === 0) {
            this.createMyLayersCategory([gifwLayer]);
        } else {
            myLayersCategory[0].layers.push(gifwLayer);
        }
        this.olMap.addLayer(ol_layer);

        let event = new CustomEvent("gifw-layer-added", { detail: ol_layer });
        this.olMap.getOverlayContainer().dispatchEvent(event);

        return ol_layer;
    }

    /**
     * Adds a 'web' layer to the map from the passed in source
     * @param {TileWMS} source The actual source layer
     * @param {string} name The name we want to give to the layer
     * @param {boolean} visible Whether the style is visible or not (defaults to true)
     * @param type The LayerGroupType of this layer, defaults to 'Overlay'
     * @param {number} zIndex The z-index to apply to the layer. Defaults to 0
     * @param {boolean} queryable Whether the layer can be queried or not
     * @param {string} layerId A unique ID for the layer. Defaults to a randomly generated GUID
     * @param olLayerOpts Additional options to add to the OpenLayers options
     */
    public addWebLayerToMap(
        source: TileWMS|ImageWMS,
        name: string,
        proxyMetaRequests: boolean = false,
        proxyMapRequests: boolean = false,
        visible: boolean = true,
        type = LayerGroupType.Overlay,
        zIndex: number = 0,
        queryable: boolean = true,
        layerId: string = uuidv4(),
        olLayerOpts = {}
    ) {
        
        let ol_layer;
        if (source instanceof TileWMS) {
            ol_layer = new olLayer.Tile({
                source: source,
                className: `layer-${layerId}`,
                visible: visible,
                zIndex: zIndex,
                ...olLayerOpts
            });
        } else {
            ol_layer = new olLayer.Image({
                source: source,
                className: `layer-${layerId}`,
                visible: visible,
                zIndex: zIndex,
                ...olLayerOpts
            });
        }



        ol_layer.setProperties({ "hasBeenOpened": visible });
        ol_layer.setProperties({ "layerId": layerId })
        ol_layer.setProperties({ "name": name });
        ol_layer.setProperties({ "gifw-queryable": queryable })
        if (proxyMetaRequests) {
            ol_layer.setProperties({ "gifw-proxy-meta-request": true });
        }
        ol_layer.setProperties({ "gifw-is-user-layer": true })
         /*TODO - This is a little odd. We have to create a 'stub' gifwLayer and an ol_layer
          * for different purposes. Be good if this was more streamlined*/
        let gifwLayer: Layer = {
            id: layerId,
            name: name,
            sortOrder: 0,
            isDefault: false,
            layerSource: undefined,
            bound: undefined,
            minZoom: 0,
            maxZoom: 0,
            zIndex: zIndex,
            defaultOpacity: 0,
            defaultSaturation: 0,
            queryable: queryable,
            infoTemplate: "",
            infoListTitleTemplate: "",
            filterable: true,
            defaultFilterEditable: false,
            removable: true,
            proxyMetaRequests: proxyMetaRequests,
            proxyMapRequests: proxyMapRequests
        }

        let layerGroup = this.getLayerGroupOfType(type);
        if (layerGroup == null) {
            layerGroup = new GIFWLayerGroup([gifwLayer], this, type)
            this.layerGroups.push(layerGroup);
        } else {
            layerGroup.addLayerToGroup(gifwLayer, ol_layer);
        }
        let myLayersCategory = this.config.categories.filter(c => c.id === 0);
        if (myLayersCategory.length === 0) {
            this.createMyLayersCategory([gifwLayer]);
        } else {
            myLayersCategory[0].layers.push(gifwLayer);
        }
        let event = new CustomEvent("gifw-layer-added", { detail: ol_layer });
        this.olMap.getOverlayContainer().dispatchEvent(event);

        return ol_layer;
    }

    private createMyLayersCategory(layers?: Layer[]): void {
        this.config.categories.push({
            name: "My Layers",
            description: "This category contains annotations, measurements, search results and any layers you add to the map",
            order: 999999,
            id: 0,
            layers: layers,
            parentCategory: null,
            open: false
        })
    }

    /**
     * Gets a single layer group by type
     * @param type Type of layer group to return
     */
    public getLayerGroupOfType(type: LayerGroupType): LayerGroup {
        let lg = this.layerGroups.filter(l => l.layerGroupType === type)[0];
        return lg;
    }

    /**
     * Gets all layer groups of a specific type
     * @param types Array of types of layer group to return
     */
    public getLayerGroupsOfType(types: LayerGroupType[]): LayerGroup[] {
        let layerGroups: LayerGroup[] = [];
        types.forEach(t => {
            let lg = this.layerGroups.filter(l => l.layerGroupType === t);
            if (lg.length !== 0) {
                layerGroups.push(lg[0]);
            }
        })
        return layerGroups;
    }

    /**
     * Gets an OpenLayers layer by its unique ID
     * @param layerId The layers unique ID
     */
    public getLayerById(layerId: string): BaseLayer {
        let layerGroups = this.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])
        let layer = null;
        layerGroups.forEach(lg => {
            
            let lgLayers = lg.olLayerGroup.getLayers();
            lgLayers.forEach(l => {
                    
                if (l.get('layerId') == layerId) {
                    layer = l;
                } 
            });
        })
        return layer;
    }

    /**
     * Gets the layer configuration information (the layer information that is not stored within the OpenLayers layer object) by ID
     * @param layerId The ID of the layer
     * @param layerGroupTypes Array types or types of layer groups to check in
     */
    public getLayerConfigById(layerId: string, layerGroupTypes: LayerGroupType[] = [LayerGroupType.Overlay, LayerGroupType.Basemap]): Layer {
        
        let layerGroups = this.getLayerGroupsOfType(layerGroupTypes);
        let layer = null;
        layerGroups.forEach(lg => {

            let lgLayers = lg.layers as Layer[];
            lgLayers.forEach(l => {

                if (l.id?.toString() == layerId) {
                    layer = l;
                }
            });
        })
        return layer;
    }

    /**
     * Checks the size of the map and sets whether the attribution is collapsible or not
     * @param map The map that the attribution is one
     * @param attribution The OpenLayers control
     * @author OpenLayers contributors https://openlayers.org/en/latest/examples/attributions.html
     */
    public checkAttributionSize(map: olMap, attribution: olControl.Attribution):void {
        let small = map.getSize()[0] < 600;
        attribution.setCollapsible(small);
        attribution.setCollapsed(small);
    }

    /**
     * Sets the --app-height css variable to the current innerHeight of the Window
     * @author Andreas Herd/StackOverflow https://stackoverflow.com/a/50683190/863487
     * */
    public setAppHeightVariable(): void {
        const doc = document.documentElement
        doc.style.setProperty('--app-height', `${window.innerHeight}px`);
        this.olMap.updateSize();
    }

    /**
     * Sets the starting saturation for the currently active basemap
     * @param {number} saturation - The saturation level to set to (0-100)
     */
    public setInitialSaturationOfBasemap(saturation: number): void {
        this.olMap.once('postrender', () => {
            this.setSaturationOfActiveBasemap(saturation,true);
        })
    }

    /**
     * Sets the starting saturation for the passed in layer
     * @param {olLayer.Layer} layer The OpenLayers layer to set the saturation for
     * @param {number} saturation - The saturation level to set to (0-100)
     */
    public setInitialSaturationOfLayer(layer: olLayer.Layer<any, any>, saturation: number): void {
        this.olMap.once('postrender', () => {
            this.setLayerSaturation(layer, saturation, true);
        })
    }

    /**
     * Gets the OpenLayers Layer for the currently active basemap
     * */
    public getActiveBasemap(): olLayer.Layer<any, any> {

        let baseGroup = this.getLayerGroupOfType(LayerGroupType.Basemap);
        if (baseGroup !== null) {
            return baseGroup.olLayerGroup.getLayersArray().find(function (l) { return l.getVisible() == true });
        }
    }

    /**
     * Sets the transparency of the currently active basemap
    * @param {number} opacity - The saturation level to set to (0-100)
    * @param {boolean} quiet - Do this without firing any events
     */
    public setTransparencyOfActiveBasemap(opacity: number, quiet: boolean = false) {
        let olOpacity = opacity / 100;
        let l = this.getActiveBasemap();
        if (l !== null) {
            l.setOpacity(olOpacity);
            if (!quiet) {
                document.getElementById(this.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
            }
        }
    }

    /**
     * Sets the saturation of the currently active basemap
    * @param {number} saturation - The saturation level to set to (0-100)
    * @param {boolean} quiet - Do this without firing any events
     */
    public setSaturationOfActiveBasemap(saturation: number, quiet: boolean = false) {
        let l = this.getActiveBasemap();
        if (l !== null) {
            this.setLayerSaturation(l, saturation, quiet);
        }
    }

    /**
    * Sets the saturation for an overlay
    *
    * @param {Layer<any>} layer - The layer we want to set the saturation for
    * @param {number} saturation - The saturation level to set to (0-100)
    * @param {boolean} quiet - Do this without firing any events
    * @returns void
    *
    */
    public setLayerSaturation(layer: olLayer.Layer<any, any>, saturation: number, quiet: boolean = false) {
        //layers should have custom class names, if it has the default, this is ignored
        let className = layer.getClassName();
        if (className !== 'ol-layer') {
            let container: HTMLDivElement = document.querySelector(`.${className}`);
            if (container !== null) {
                let olSaturation = (100 - saturation) / 100;
                container.style.filter = `grayscale(${olSaturation})`;
                layer.set("saturation", saturation, quiet);
                if (!quiet) {
                    document.getElementById(this.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
                }
            }
        }
    }


    /**
    * Sets the opacity for an overlay
    *
    * @param {Layer<any>} layer - The layer we want to set the opacity for
    * @param {number} opacity - The opacity level to set to (0-100)
    * @returns void
    *
    */
    public setLayerOpacity(layer: olLayer.Layer<any, any>, opacity: number) {
        layer.setOpacity(opacity / 100);
        document.getElementById(this.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));

    }

    /**
     * Checks to see if any overlays are currently turned on
     * 
     * @returns Boolean indicating whether there are any layers turned on or not
     * */
    public anyOverlaysOn(): boolean {
        
        let layerGroups = this.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])

        let layers: olLayer.Layer<any, any>[] = [];
        layerGroups.forEach(lg => {
            layers = layers.concat(lg.olLayerGroup.getLayersArray());
        })

        return layers.filter(l => l.getVisible() === true).length !== 0;
    }

    /**
    * Set a layers visibility by ID
    * 
    * @param {string} layerId - The ID of the layer
    * @param {boolean} visibility - The state we want to set the layer to
    * @returns void
    *
    */
    public setLayerVisibility(layerId: string, visibility: boolean) {

        let layerGroups = this.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])
        let layers: olLayer.Layer<any, any>[] = [];

        layerGroups.forEach(lg => {
            layers = layers.concat(lg.olLayerGroup.getLayersArray());
        })


        let layer = layers.filter(l => l.get('layerId') == layerId)[0];

        layer.setVisible(visibility)

    }

    /**
     * Completely removes a layer from the map by its unique ID
     * @param layerId The unique ID of the layer
     */
    public removeLayerById(layerId: string) {
        let layerGroups = this.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])
        let removed = false;
        this.config.categories.forEach(c => {
            let idx = c.layers.findIndex(l => l.id == layerId);
            if (idx !== -1) {
                c.layers.splice(idx, 1);
            }
        })
        layerGroups.forEach(lg => {
            if (!removed) {
                let lgLayers = lg.olLayerGroup.getLayers();
                lgLayers.forEach(l => {
                    if (!removed) {
                        if (l.get('layerId') == layerId) {
                            //remove from map
                            this.olMap.removeLayer(l);
                            //remove from layer group
                            lgLayers.remove(l);
                            removed = true;

                            let evt = new CustomEvent('gifw-layer-removed', { 'detail': l })
                            this.olMap.getOverlayContainer().dispatchEvent(evt);
                        }
                    }
                });
            }

        })

    }

    /**
     * Zooms the map to a particular features extent. Will animate the zoom if the extent is in view and the user hasn't enabled Prefers Reduced Motion
     * @param feature The Feature to zoom to
     */
    public zoomToFeature(feature: (Feature<Geometry> | RenderFeature)) {
        let featureExtent = feature.getGeometry().getExtent();
        this.fitMapToExtent(featureExtent);
    }


    public fitMapToExtent(extent: Extent, maxZoom: number = 50, animationDuration: number = 1000): void {
        let curExtent = this.olMap.getView().calculateExtent();
        if (!Util.Browser.PrefersReducedMotion() && containsExtent(curExtent, extent)) {
            this.olMap.getView().fit(extent, { padding: this.getPaddingForMapCenter(), maxZoom: maxZoom, duration: animationDuration });
        } else {
            this.olMap.getView().fit(extent, { padding: this.getPaddingForMapCenter(), maxZoom: maxZoom });
        }
    }

    /**
     * Gets the percentage of the map that is covered by overlays (left and right panels). Only returns width, does not care about height
     * @returns A number indicating the percentage of the map that is covered by overlays
     */
    public getPercentOfMapCoveredWithOverlays(): number {
        let mapPadding = this.getPaddingForMapCenter();
        const screenWidth = this.olMap.getOverlayContainer().getBoundingClientRect().width;
        const leftPanelPercentWidth = (mapPadding[3] / screenWidth) * 100;
        const rightPanelPercentWidth = (mapPadding[1] / screenWidth) * 100;
        return leftPanelPercentWidth + rightPanelPercentWidth;
    }

    /**
     * Gets the padding required for view operations to center on the middle of the visible map not including open panels
     * @param defaultPadding Optional default padding to apply. Defaults to 100
     * @returns array of 4 numbers
     */
    public getPaddingForMapCenter(defaultPadding: number = 100): number[] {
        let leftPadding = (document.querySelector('#gifw-sidebar-left') as HTMLDivElement).getBoundingClientRect().width;
        let rightPadding = (document.querySelector('#gifw-sidebar-right') as HTMLDivElement).getBoundingClientRect().width;
        const screenWidth = this.olMap.getOverlayContainer().getBoundingClientRect().width;
        const leftPanelPercentWidth = (leftPadding / screenWidth) * 100;
        if (leftPanelPercentWidth > 50) {
            leftPadding = defaultPadding;
        }
        const rightPanelPercentWidth = (rightPadding / screenWidth) * 100;
        if (rightPanelPercentWidth > 50) {
            rightPadding = defaultPadding;
        }

        return [defaultPadding, rightPadding, defaultPadding, leftPadding];
    }

    /**
     * Checks to see if the passed in extent is reachable in the current map
     * @param extent The Extent to check
     * @returns Boolean, true if extent is reachable, false otherwise
     */
    public isExtentAvailableInCurrentMap(extent: Extent): boolean {
        let activeBasemap = this.getActiveBasemap();
        let maxBasemapExtent = activeBasemap.getExtent();
        return containsExtent(maxBasemapExtent, extent)
    }

    /**
     * Checks to see if the passed in coordinate is reachable in the current map
     * @param coord The coordinates to check in the current map views coordinate system
     *  @returns Boolean, true if coordinate is reachable, false otherwise
     */
    public isCoordinateAvailableInCurrentMap(coord:number[]): boolean {
        let activeBasemap = this.getActiveBasemap();
        let maxBasemapExtent = activeBasemap.getExtent();
        return containsCoordinate(maxBasemapExtent, coord)
    }

    /**
     * Disables the context menu
     */
    public disableContextMenu() {
        document.getElementById(this.id).classList.add('context-menu-disabled');
    }

    /**
     * Enables the context menu
     */
    public enableContextMenu() {
        document.getElementById(this.id).classList.remove('context-menu-disabled');
    }

    /**
     * Hides any popups currently visible
     */
    public hidePopup() {
        this.popupOverlay.overlay.setPosition(undefined);
    }

    /**
     * Deactivates all interactions by dispatching a list of known events
     */
    public deactivateInteractions() {
        document.getElementById(this.id).dispatchEvent(new Event('gifw-measure-deactivate'));
        document.getElementById(this.id).dispatchEvent(new Event('gifw-annotate-deactivate'));
        document.getElementById(this.id).dispatchEvent(new Event('gifw-feature-query-deactivate'));
    }

    /**
    * Resets all interactions to their starting defaults by dispatching a list of known events
    */
    public resetInteractionsToDefault() {
        document.getElementById(this.id).dispatchEvent(new Event('gifw-measure-deactivate'));
        document.getElementById(this.id).dispatchEvent(new Event('gifw-annotate-deactivate'));
        document.getElementById(this.id).dispatchEvent(new Event('gifw-feature-query-activate'));
    }

    /**
     * Opens a sidebar by its unique ID
     * @param id The unique ID of the sidebar
     */
    public openSidebarById(id: string) {
        
        let matchedSidebar = this.sidebars.filter(s => s.id === id);
        if (matchedSidebar.length === 1) {
            matchedSidebar[0].open();
        } else {
            console.warn(`Sidebar with ID ${id} not found or more than one found`);
        }
        
    }

    public createProxyURL(url: string) {
        return `${document.location.protocol}//${this.config.appRoot}proxy?url=${encodeURIComponent(url)}`;
    }
}




