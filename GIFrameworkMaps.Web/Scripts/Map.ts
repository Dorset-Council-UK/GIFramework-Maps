import { Feature, Map as olMap, View as olView } from "ol";
import * as olControl from "ol/control";
import * as olProj from "ol/proj";
import * as olLayer from "ol/layer";
import { Extent, containsExtent, applyTransform } from "ol/extent";
import * as gifwSidebar from "../Scripts/Sidebar";
import * as gifwSidebarCollection from "../Scripts/SidebarCollection";
import { GIFWMousePositionControl } from "../Scripts/MousePositionControl";
import { ImageWMS, Source, TileWMS, Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { Layer } from "./Interfaces/Layer";
import { GIFWPopupOverlay } from "./Popups/PopupOverlay";
import { GIFWLayerGroup } from "./LayerGroup/GIFWLayerGroup";
import { GIFWContextMenu } from "./ContextMenu";
import { GIFWGeolocation } from "./Geolocation";
import Geometry from "ol/geom/Geometry";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import { NativeLayerGroup } from "./LayerGroup/NativeLayerGroup";
import { LayerGroup } from "./LayerGroup/LayerGroup";
import { KML } from "ol/format";
import { LayerUpload } from "./LayerUpload";
import BaseLayer from "ol/layer/Base";
import RenderFeature from "ol/render/Feature";
import { Measure } from "./Measure";
import Annotate from "./Annotate/Annotate";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";
import { FeatureQuery } from "./FeatureQuery/FeatureQuery";
import AnnotationStylePanel from "./Panels/AnnotationStylePanel";
import { Search } from "./Search";
import { Streetview } from "./Streetview";
import { VersionViewModel } from "./Interfaces/VersionViewModel";
import { WebLayerService } from "./WebLayerService";
import { BookmarkMenu } from "./BookmarkMenu";
import { LegendURLs } from "./Interfaces/LegendURLs";
import { DebouncedFunc } from "lodash";
import {
  getDefaultStyleByGeomType,
  extractParamsFromHash,
  PrefersReducedMotion,
  extractCustomHeadersFromLayerSource,
  getLayerSourceOptionValueByName
} from "./Util";
import LayerRenderer from "ol/renderer/Layer";
import { Projection } from "./Interfaces/Projection";
import { VersionToggler } from "./VersionToggler";
import { getItem as getSetting, setItem as setSetting } from "./UserSettings";
import { AuthManager } from "./AuthManager";
import {
  permaLinkDelayedUpdate,
  updatePermalinkInURL,
  updatePermalinkInLinks,
  updateBaseMapFromLinkParams,
} from "./PermalinkUtils";
import { LegendRenderer } from "geostyler-legend";

// Type definitions for internal use
interface ProjectionInfo {
  defaultMapProjection: Projection;
  defaultViewProjection: Projection;
  mapProjectionCode: string;
  viewProjection: olProj.Projection;
  fromLonLat: olProj.TransformFunction;
  from3857: olProj.TransformFunction;
}

interface ViewParameters {
  defaultZoom: number;
  defaultCenter: number[];
  defaultRotation: number;
  defaultCRS: number;
  defaultBbox?: number[];
  locationProvidedByURL: boolean;
}

interface LayerProcessingResult {
  allLayers: Layer[];
  overrideDefaultLayers: boolean;
  permalinkEnabledLayers: string[][];
}

export class GIFWMap {
  id: string;
  config: VersionViewModel;
  layerGroups: LayerGroup[];
  sidebars: gifwSidebar.Sidebar[];
  popupOverlay: GIFWPopupOverlay;
  mode: "full" | "embed" = "full";
  olMap: olMap;
  authManager: AuthManager;
  customControls: (
    | GIFWMousePositionControl
    | GIFWContextMenu
    | Annotate
    | Measure
    | FeatureQuery
    | GIFWGeolocation
  )[] = [];
  private delayPermalinkUpdate: DebouncedFunc<() => void>;

  // Cache for vector legends - keyed by layer ID and color mode
  private vectorLegendCache: Map<string, string> = new Map();

  // Cache frequently accessed DOM elements
  private readonly mapElement: HTMLElement;
  private readonly leftSidebarElement: HTMLElement;
  private readonly rightSidebarElement: HTMLElement;

  constructor(
    id: string,
    config: VersionViewModel,
    sidebars: gifwSidebar.Sidebar[],
    mode: "full" | "embed",
    accessToken: string
  ) {
    this.id = id;
    this.config = config;
    this.sidebars = sidebars;
    this.mode = mode;
    this.delayPermalinkUpdate = permaLinkDelayedUpdate(this);
    this.authManager = new AuthManager(
      accessToken,
      this.config.urlAuthorizationRules,
      `${document.location.protocol}//${this.config.appRoot}account/token`
    );

    // Cache DOM elements
    this.mapElement = document.getElementById(this.id);
    this.leftSidebarElement = document.querySelector(
      "#gifw-sidebar-left"
    ) as HTMLElement;
    this.rightSidebarElement = document.querySelector(
      "#gifw-sidebar-right"
    ) as HTMLElement;
  }

  /**
   * Initializes the map
   * @returns OpenLayers map reference to the created map
   * */
  public async initMap(): Promise<olMap> {
    // Initialize authentication
    await this.initAuthentication();

    // Set up projections
    const projectionInfo = this.setupProjections();

    // Parse permalink parameters
    const permalinkParams = this.parsePermalinkParams();

    // Create map controls
    const controls = this.createMapControls(projectionInfo.defaultViewProjection);

    // Set up layer groups
    await this.setupLayerGroups(permalinkParams);

    // Create the OpenLayers map
    const map = this.createOpenLayersMap(controls, projectionInfo, permalinkParams);

    // Configure initial map state
    await this.configureInitialMapState(map, projectionInfo, permalinkParams);

    // Initialize additional components
    this.initializeAdditionalComponents(controls, permalinkParams);

    // Set up event listeners
    this.setupEventListeners(map);

    return map;
  }

  /**
   * Initialize authentication if the user is logged in
   */
  private async initAuthentication(): Promise<void> {
    if (this.config.isLoggedIn) {
      await this.authManager.refreshAccessToken();
      // Check for new token every 2 minutes
      // TODO - make this smarter or at least configurable
      window.setInterval(async () => {
        await this.authManager.refreshAccessToken();
      }, AUTH_TOKEN_REFRESH_INTERVAL);
    }
  }

  /**
   * Set up map projections and return projection information
   */
  private setupProjections(): ProjectionInfo {
    this.registerProjections(this.config.availableProjections);
    const defaultMapProjection = this.config.availableProjections.filter(
      (p: Projection) => p.isDefaultMapProjection === true
    )[0];
    const defaultViewProjection = this.config.availableProjections.filter(
      (p: Projection) => p.isDefaultViewProjection === true
    )[0];
    const mapProjectionCode = `EPSG:${defaultMapProjection.epsgCode}`;
    const viewProjection = olProj.get(mapProjectionCode);
    const fromLonLat = olProj.getTransform("EPSG:4326", viewProjection);
    const from3857 = olProj.getTransform("EPSG:3857", viewProjection);

    return {
      defaultMapProjection,
      defaultViewProjection,
      mapProjectionCode,
      viewProjection,
      fromLonLat,
      from3857,
    };
  }

  /**
   * Parse permalink parameters from the URL hash
   */
  private parsePermalinkParams(): Record<string, string> {
    let permalinkParams: Record<string, string> = {};
    if (window.location.hash !== "") {
      permalinkParams = extractParamsFromHash(window.location.hash);
    }
    return permalinkParams;
  }

  /**
   * Create all map controls
   */
  private createMapControls(defaultViewProjection: Projection): olControl.Control[] {
    // Set up basic controls
    const attribution = new olControl.Attribution({
      collapsible: true,
      collapsed: this.mode === "embed",
      attributions: this.config.attribution?.renderedAttributionHTML,
    });

    const scalelineType = getSetting("prefersScaleBar") === "true" ? "bar" : "line";
    const scaleline = this.createScaleLineControl(scalelineType);

    const rotateControl = new olControl.Rotate({
      autoHide: false,
      tipLabel: "Reset rotation (Alt-Shift and Drag to rotate)",
    });

    // Create custom controls
    const mousePosition = new GIFWMousePositionControl(
      defaultViewProjection.epsgCode.toString(),
      defaultViewProjection.defaultRenderedDecimalPlaces,
      this.config.availableProjections
    );
    const contextMenu = new GIFWContextMenu(mousePosition);
    const measureControl = new Measure(this);
    const annotateControl = new Annotate(this);
    const infoControl = new FeatureQuery(this);
    const geolocationControl = new GIFWGeolocation(this);

    // Store custom controls for later reference
    this.customControls.push(
      mousePosition,
      contextMenu,
      measureControl,
      annotateControl,
      infoControl,
      geolocationControl
    );

    // Combine all controls
    const controls: olControl.Control[] = [
      rotateControl,
      measureControl,
      annotateControl,
      infoControl,
      geolocationControl,
      scaleline,
      mousePosition.control,
      contextMenu.control,
      attribution,
    ];

    // Add sidebar controls
    const sidebarCollection = new gifwSidebarCollection.SidebarCollection(this.sidebars);
    sidebarCollection.initSidebarCollection();
    sidebarCollection.sidebars.forEach((sb) => {
      controls.push(sb.control);
    });

    return controls;
  }

  /**
   * Set up layer groups (basemaps and overlays)
   */
  private async setupLayerGroups(permalinkParams: Record<string, string>): Promise<void> {
    // Parse the permalink basemap parameters and display the correct basemap
    updateBaseMapFromLinkParams(this, permalinkParams);

    this.layerGroups = [];

    // Create basemap group
    const basemapGroup = new GIFWLayerGroup(
      this.config.basemaps,
      this,
      LayerGroupType.Basemap
    );
    basemapGroup.olLayerGroup = await basemapGroup.createLayersGroup();
    basemapGroup.addChangeEvents();
    this.layerGroups.push(basemapGroup);

    // Process permalink layer settings
    const { allLayers } = this.processPermalinkLayerSettings(permalinkParams);

    // Create overlay group
    const overlayGroup = new GIFWLayerGroup(
      allLayers,
      this,
      LayerGroupType.Overlay
    );
    overlayGroup.olLayerGroup = await overlayGroup.createLayersGroup();
    overlayGroup.addChangeEvents();
    this.layerGroups.push(overlayGroup);
  }

  /**
   * Process permalink layer settings and return processed layer information
   */
  private processPermalinkLayerSettings(permalinkParams: Record<string, string>): LayerProcessingResult {
    const permalinkEnabledLayers: string[][] = [];

    if (permalinkParams.layers) {
      const permalinkEnabledLayerSettings = permalinkParams.layers.split(",");
      permalinkEnabledLayerSettings.forEach((p) => {
        permalinkEnabledLayers.push(p.split("/"));
      });
    }

    const overrideDefaultLayers = permalinkEnabledLayers.length > 0;
    const flattenedLayers = this.config.categories.flat();
    const allLayers: Layer[] = [];

    // Create a Map for faster lookups if we're overriding default layers
    const layerSettingsMap = new Map<string, string[]>();
    if (overrideDefaultLayers) {
      permalinkEnabledLayers.forEach((setting) => {
        if (setting.length > 0) {
          layerSettingsMap.set(setting[0], setting);
        }
      });
    }

    flattenedLayers.forEach((f) => {
      f.layers.forEach((l) => {
        if (overrideDefaultLayers) {
          const layerSetting = layerSettingsMap.get(`${l.id}`);
          if (layerSetting) {
            l.isDefault = true;
            if (layerSetting.length >= 3) {
              l.defaultOpacity = parseInt(layerSetting[1]);
              l.defaultSaturation = parseInt(layerSetting[2]);
            }
          } else {
            l.isDefault = false;
          }
        }
        allLayers.push(l);
      });
    });

    return { allLayers, overrideDefaultLayers, permalinkEnabledLayers };
  }

  /**
   * Create the OpenLayers map instance
   */
  private createOpenLayersMap(
    controls: olControl.Control[],
    projectionInfo: ProjectionInfo,
    permalinkParams: Record<string, string>
  ): olMap {
    // Get all layer groups for the map
    const flattenedLayerGroups = this.layerGroups.flat();
    const allLayerGroups: olLayer.Group[] = [];
    flattenedLayerGroups.forEach((f) => {
      allLayerGroups.push(f.olLayerGroup);
    });

    // Define popups
    const popupEle = document.getElementById("gifw-popup");
    this.popupOverlay = new GIFWPopupOverlay(popupEle);

    // Get zoom settings from basemap
    let startMaxZoom: number = DEFAULT_MAX_ZOOM;
    let startMinZoom: number = DEFAULT_MIN_ZOOM;
    const startBasemap = this.config.basemaps.find((b) => b.isDefault);
    if (startBasemap !== null && startBasemap !== undefined) {
      startMaxZoom = startBasemap.maxZoom;
      startMinZoom = startBasemap.minZoom;
    }

    // Parse view parameters from permalink
    const viewParams = this.parseViewParameters(permalinkParams);

    // Create the map
    const map = new olMap({
      target: this.id,
      layers: allLayerGroups,
      overlays: [this.popupOverlay.overlay],
      controls: olControl.defaults({ attribution: false }).extend(controls),
      view: new olView({
        center: olProj.transform(
          viewParams.defaultCenter,
          olProj.get(`EPSG:${viewParams.defaultCRS}`),
          olProj.get(projectionInfo.mapProjectionCode)
        ),
        zoom: viewParams.defaultZoom,
        projection: projectionInfo.mapProjectionCode,
        extent: applyTransform(projectionInfo.viewProjection.getWorldExtent(), projectionInfo.fromLonLat),
        constrainOnlyCenter: true,
        maxZoom: startMaxZoom,
        minZoom: startMinZoom,
        rotation: viewParams.defaultRotation,
      }),
      keyboardEventTarget: document
    });

    this.olMap = map;
    return map;
  }

  /**
   * Parse view parameters from permalink
   */
  private parseViewParameters(permalinkParams: Record<string, string>): ViewParameters {
    let defaultZoom = DEFAULT_ZOOM;
    let defaultCenter = [...DEFAULT_CENTER]; // Create a copy to avoid mutation
    let defaultRotation = DEFAULT_ROTATION;
    let defaultCRS = DEFAULT_CRS;
    let defaultBbox: number[] | undefined;
    let locationProvidedByURL = false;

    if (!permalinkParams) {
      return {
        defaultZoom,
        defaultCenter,
        defaultRotation,
        defaultCRS,
        defaultBbox,
        locationProvidedByURL,
      };
    }

    // Try the 'map' parameter first
    if (permalinkParams.map) {
      const parts = permalinkParams.map.split("/");
      if (parts.length >= 4) {
        locationProvidedByURL = true;
        defaultZoom = parseFloat(parts[0]) || defaultZoom;
        defaultCenter = [parseFloat(parts[1]), parseFloat(parts[2])];
        defaultRotation = parseFloat(parts[3]) || 0;
        defaultCRS = parseFloat(parts[4]) || DEFAULT_CRS;
        if (defaultCRS === DEFAULT_CRS) {
          // Reverse coordinates for lat/lon display format
          defaultCenter.reverse();
        }
      }
    }
    // Try bbox parameter if no map parameter
    else if (permalinkParams.bbox) {
      const parts = permalinkParams.bbox.split("/");
      if (parts.length !== 0) {
        const bbox = parts[0].split(",");
        if (bbox.length === 4) {
          if (bbox.every((c) => !isNaN(parseFloat(c)))) {
            defaultBbox = bbox.map((c) => parseFloat(c));
            locationProvidedByURL = true;
          }
        }
        if (parts.length === 2) {
          defaultCRS = parseFloat(parts[1]) || DEFAULT_CRS;
        }
      }
    }

    return {
      defaultZoom,
      defaultCenter,
      defaultRotation,
      defaultCRS,
      defaultBbox,
      locationProvidedByURL,
    };
  }

  /**
   * Configure initial map state (saturation, bounds, etc.)
   */
  private async configureInitialMapState(
    map: olMap,
    projectionInfo: ProjectionInfo,
    permalinkParams: Record<string, string>
  ): Promise<void> {
    if (this.getActiveBasemap() !== undefined) {
      const startBasemap = this.config.basemaps.find((b) => b.isDefault);
      // Set starting saturation of basemap
      if (startBasemap && startBasemap.defaultSaturation !== 100) {
        this.setInitialSaturationOfBasemap(startBasemap.defaultSaturation);
      }
    } else {
      //there was some sort of problem, and there is currently no active basemap.
      //Switch on the first basemap in the list
      console.warn("The intended start basemap could not be found, switching to first in group");
      const baseGroup = this.getLayerGroupOfType(LayerGroupType.Basemap).olLayerGroup;
      const defaultBasemap = baseGroup.getLayersArray()[0];
      defaultBasemap.setVisible(true);
    }
    
    const viewParams = this.parseViewParameters(permalinkParams);
    const { overrideDefaultLayers, permalinkEnabledLayers } = this.processPermalinkLayerSettings(permalinkParams);
    // Set starting saturation and style of layers
    if (this.anyOverlaysOn()) {
      const layerGroup = this.getLayerGroupOfType(LayerGroupType.Overlay);
      const layers = layerGroup.olLayerGroup.getLayersArray();
      const switchedOnLayers = layers.filter((l) => l.getVisible() === true);

      switchedOnLayers.forEach((l) => {
        const layerId = l.get("layerId");
        const layer = this.getLayerConfigById(layerId, [LayerGroupType.Overlay]);

        if (layer !== null && layer.defaultSaturation !== 100) {
          this.setInitialSaturationOfLayer(
            l as olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>,
            layer.defaultSaturation
          );
        }

        if (overrideDefaultLayers) {
          this.applyPermalinkStyleSettings(l, layerId, permalinkEnabledLayers);
        }
      });
    }

    // Set start bounds
    this.setInitialMapBounds(map, viewParams, projectionInfo);

    // Add attribution size checker for non-embed mode
    if (this.mode !== "embed") {
      const attribution = map.getControls().getArray().find((c) => c instanceof olControl.Attribution) as olControl.Attribution;
      window.addEventListener("resize", () => {
        this.checkAttributionSize(map, attribution);
      });
      this.checkAttributionSize(map, attribution);
    }
  }

  /**
   * Apply permalink style settings to a layer
   */
  private applyPermalinkStyleSettings(
    layer: olLayer.Layer,
    layerId: string,
    permalinkEnabledLayers: string[][]
  ): void {
    const layerSetting = permalinkEnabledLayers.filter(
      (pel) => pel[0] == layerId
    );
    if (layerSetting.length === 1) {
      if (layerSetting[0].length === 4) {
        const permalinkStyleName = layerSetting[0][3];
        const layerSource = layer.getSource();
        if (layerSource instanceof TileWMS || layerSource instanceof ImageWMS) {
          const currentStyleName = layerSource.getParams()?.STYLES || "";
          if (currentStyleName !== permalinkStyleName) {
            layerSource.updateParams({ STYLES: permalinkStyleName });
          }
        }
      }
    }
  }

  /**
   * Set initial map bounds based on parameters or default bounds
   */
  private setInitialMapBounds(
    map: olMap,
    viewParams: ViewParameters,
    projectionInfo: ProjectionInfo
  ): void {
    // Check parameter defined bbox first, then fall back to default start bound
    if (viewParams.locationProvidedByURL && viewParams.defaultBbox) {
      const mapSize = map.getSize();
      const reprojectedExtent = olProj.transformExtent(
        viewParams.defaultBbox,
        `EPSG:${viewParams.defaultCRS}`,
        this.olMap.getView().getProjection()
      );
      this.olMap.getView().fit(reprojectedExtent, { size: mapSize });
    }
    if (!viewParams.locationProvidedByURL) {
      const bounds: Extent = [
        this.config.bound.bottomLeftX,
        this.config.bound.bottomLeftY,
        this.config.bound.topRightX,
        this.config.bound.topRightY,
      ];
      const mapSize = map.getSize();
      const reprojectedExtent = applyTransform(bounds, projectionInfo.from3857);
      map.getView().fit(reprojectedExtent, { size: mapSize });
    }
  }

  /**
   * Initialize additional components and services
   */
  private initializeAdditionalComponents(
    controls: olControl.Control[],
    permalinkParams: Record<string, string>
  ): void {
    // Add drag and drop
    this.addDragAndDropInteraction();

    // Add remote layer service
    const webLayerService = new WebLayerService(this);
    webLayerService.init();

    // Add bookmark control for logged in users
    if (this.config.isLoggedIn) {
      const bookmarkControl = new BookmarkMenu(this);
      bookmarkControl.init();
    }

    // Add version toggler
    const versionToggler = new VersionToggler(this);
    versionToggler.init();

    // Initialize controls
    const measureControl = this.customControls.find((c) => c instanceof Measure) as Measure;
    const infoControl = this.customControls.find((c) => c instanceof FeatureQuery) as FeatureQuery;
    const geolocationControl = this.customControls.find((c) => c instanceof GIFWGeolocation) as GIFWGeolocation;
    const contextMenu = this.customControls.find((c) => c instanceof GIFWContextMenu) as GIFWContextMenu;
    const annotateControl = this.customControls.find((c) => c instanceof Annotate) as Annotate;

    measureControl.init();
    infoControl.init();
    geolocationControl.init();

    // Initialize search
    const search = new Search(
      "#search-container",
      this,
      `${document.location.protocol}//${this.config.appRoot}search/options/${this.config.id}`,
      `${document.location.protocol}//${this.config.appRoot}search`
    );
    search.init(permalinkParams);

    // Add streetview if Google Maps API key is available
    if (this.config.googleMapsAPIKey) {
      const streetview = new Streetview(this.config.googleMapsAPIKey);
      streetview.init(contextMenu);
    }

    // Set up annotation style panel
    this.setupAnnotationStylePanel(annotateControl);

    // Add scale bar changer
    const scalelineType = getSetting("prefersScaleBar") === "true" ? "bar" : "line";
    this.attachScaleBarSwitcherListener(scalelineType);
  }

  /**
   * Set up the annotation style panel and sidebar
   */
  private setupAnnotationStylePanel(annotateControl: Annotate): void {
    const annotationStylePanel = new AnnotationStylePanel("#annotation-style-panel");
    const annotationStyleIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#FFFFFF" class="bi bi-brush-fill" viewBox="0 0 16 16">
          <path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.067 6.067 0 0 1-2.373 1.534c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.118 8.118 0 0 1-3.078.132 3.659 3.659 0 0 1-.562-.135 1.382 1.382 0 0 1-.466-.247.714.714 0 0 1-.204-.288.622.622 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 1.746-.896.126.007.243.025.348.048.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04z"/>
        </svg>
    `;

    const annotationStyleSidebar = new gifwSidebar.Sidebar(
      "annotation-style-panel",
      "Modify annotation style",
      "Change the appearance of your annotations",
      `data:image/svg+xml; charset=utf8, ${encodeURIComponent(annotationStyleIcon)}`,
      3,
      annotationStylePanel
    );

    annotationStylePanel.setGIFWMapInstance(this);
    annotationStylePanel.setListeners(annotationStyleSidebar);
    annotateControl.init();
  }

  /**
   * Set up event listeners for the map
   */
  private setupEventListeners(map: olMap): void {
    // Add permalink updater
    map.on("moveend", () => {
      this.mapElement.dispatchEvent(new CustomEvent("gifw-update-permalink"));
    });

    this.mapElement.addEventListener("gifw-update-permalink", () => {
      updatePermalinkInURL(this);
      updatePermalinkInLinks(this);
    });
  }

  private registerProjections(availableProjections: Projection[]) {
    availableProjections.forEach((projection) => {
      if (projection.proj4Definition !== null) {
        proj4.defs(`EPSG:${projection.epsgCode}`, projection.proj4Definition);
        //Adds GML version to get round GML readFeature issues - https://github.com/openlayers/openlayers/issues/3898#issuecomment-120899034
        proj4.defs(
          `http://www.opengis.net/gml/srs/epsg.xml#${projection.epsgCode}`,
          projection.proj4Definition
        );
        register(proj4);
        const addedProj = olProj.get(`EPSG:${projection.epsgCode}`);
        const addedGMLProj = olProj.get(
          `http://www.opengis.net/gml/srs/epsg.xml#${projection.epsgCode}`
        );
        addedProj.setWorldExtent([
          projection.minBoundX,
          projection.minBoundY,
          projection.maxBoundX,
          projection.maxBoundY,
        ]);
        addedGMLProj.setWorldExtent([
          projection.minBoundX,
          projection.minBoundY,
          projection.maxBoundX,
          projection.maxBoundY,
        ]);
        olProj.addEquivalentProjections([addedProj, addedGMLProj]);
      }
    });
  }

  /**
   * Adds the Drag and Drop layer upload interaction
   * */
  private addDragAndDropInteraction() {
    new LayerUpload(this, this.mapElement);
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
  /* eslint-disable @typescript-eslint/no-explicit-any -- Cannot find suitable type that can be used as is for style */
  public addNativeLayerToMap(
    source: VectorSource<Feature>,
    name: string,
    style?: any,
    visible: boolean = true,
    type = LayerGroupType.UserNative,
    zIndex: number = 0,
    queryable: boolean = true,
    layerId: string = crypto.randomUUID(),
    olLayerOpts = {}
  ) {
    /* eslint-enable @typescript-eslint/no-explicit-any */

    let styleFunc = (feature: Feature<Geometry>) => {
      return getDefaultStyleByGeomType(
        feature.getGeometry().getType(),
        this.config.theme
      );
    };
    if (style) {
      styleFunc = style;
    }
    let ol_layer;
    let opts = {
      source: source,
      className: `layer-${layerId}`,
      visible: visible,
      zIndex: zIndex,
      ...olLayerOpts,
    };
    if (source instanceof KML) {
      ol_layer = new VectorLayer(opts);
    } else {
      const additionalOpts = { style: styleFunc };
      opts = { ...opts, ...additionalOpts };
      ol_layer = new VectorLayer(opts);
    }

    ol_layer.setProperties({ hasBeenOpened: visible });
    ol_layer.setProperties({ layerId: layerId });
    ol_layer.setProperties({ name: name });
    ol_layer.setProperties({ "gifw-queryable": queryable });
    ol_layer.setProperties({ "gifw-is-user-layer": true });

    const gifwLayer: Layer = {
      id: layerId,
      name: name,
      sortOrder: 0,
      isDefault: false,
      layerSource: undefined,
      layerDisclaimer: undefined,
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
      removable: type === LayerGroupType.UserNative,
      proxyMetaRequests: false,
      proxyMapRequests: false,
      refreshInterval: 0,
    };

    const layerGroup = this.getLayerGroupOfType(type);
    if (layerGroup == null) {
      const nativeLayerGroup = new NativeLayerGroup([ol_layer], this, type);
      nativeLayerGroup.olLayerGroup = nativeLayerGroup.createLayersGroup();
      nativeLayerGroup.addChangeEvents();

      this.layerGroups.push(nativeLayerGroup);
    } else {
      layerGroup.addLayerToGroup(ol_layer);
    }
    const myLayersCategory = this.config.categories.filter((c) => c.id === 0);
    if (myLayersCategory.length === 0) {
      this.createMyLayersCategory([gifwLayer]);
    } else {
      myLayersCategory[0].layers.push(gifwLayer);
    }
    this.olMap.addLayer(ol_layer);

    const event = new CustomEvent("gifw-layer-added", { detail: ol_layer });
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
    source: TileWMS | ImageWMS,
    name: string,
    proxyMetaRequests: boolean = false,
    proxyMapRequests: boolean = false,
    visible: boolean = true,
    type = LayerGroupType.Overlay,
    zIndex: number = 0,
    queryable: boolean = true,
    layerId: string = crypto.randomUUID(),
    olLayerOpts = {}
  ) {
    let ol_layer;
    if (source instanceof TileWMS) {
      ol_layer = new olLayer.Tile({
        source: source,
        className: `layer-${layerId}`,
        visible: visible,
        zIndex: zIndex,
        ...olLayerOpts,
      });
    } else {
      ol_layer = new olLayer.Image({
        source: source,
        className: `layer-${layerId}`,
        visible: visible,
        zIndex: zIndex,
        ...olLayerOpts,
      });
    }

    ol_layer.setProperties({ hasBeenOpened: visible });
    ol_layer.setProperties({ layerId: layerId });
    ol_layer.setProperties({ name: name });
    ol_layer.setProperties({ "gifw-queryable": queryable });
    if (proxyMetaRequests) {
      ol_layer.setProperties({ "gifw-proxy-meta-request": true });
    }
    ol_layer.setProperties({ "gifw-is-user-layer": true });
    /*TODO - This is a little odd. We have to create a 'stub' gifwLayer and an ol_layer
     * for different purposes. Be good if this was more streamlined*/
    const gifwLayer: Layer = {
      id: layerId,
      name: name,
      sortOrder: 0,
      isDefault: false,
      layerSource: undefined,
      layerDisclaimer: undefined,
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
      proxyMapRequests: proxyMapRequests,
      refreshInterval: 0,
    };

    let layerGroup = this.getLayerGroupOfType(type);
    if (layerGroup == null) {
      layerGroup = new GIFWLayerGroup([gifwLayer], this, type);
      this.layerGroups.push(layerGroup);
    } else {
      layerGroup.addLayerToGroup(gifwLayer, ol_layer);
    }
    const myLayersCategory = this.config.categories.filter((c) => c.id === 0);
    if (myLayersCategory.length === 0) {
      this.createMyLayersCategory([gifwLayer]);
    } else {
      myLayersCategory[0].layers.push(gifwLayer);
    }
    const event = new CustomEvent("gifw-layer-added", { detail: ol_layer });
    this.olMap.getOverlayContainer().dispatchEvent(event);

    return ol_layer;
  }

  private createMyLayersCategory(layers?: Layer[]): void {
    this.config.categories.push({
      name: "My Layers",
      description:
        "This category contains annotations, measurements, search results and any layers you add to the map",
      order: 999999,
      id: 0,
      layers: layers,
      parentCategory: null,
      open: false,
    });
  }

  /**
   * Gets a single layer group by type
   * @param type Type of layer group to return
   */
  public getLayerGroupOfType(type: LayerGroupType): LayerGroup {
    const lg = this.layerGroups.filter((l) => l.layerGroupType === type)[0];
    return lg;
  }

  /**
   * Gets all layer groups of a specific type
   * @param types Array of types of layer group to return
   */
  public getLayerGroupsOfType(types: LayerGroupType[]): LayerGroup[] {
    const layerGroups: LayerGroup[] = [];
    types.forEach((t) => {
      const lg = this.layerGroups.filter((l) => l.layerGroupType === t);
      if (lg.length !== 0) {
        layerGroups.push(lg[0]);
      }
    });
    return layerGroups;
  }

  /**
   * Gets an OpenLayers layer by its unique ID
   * @param layerId The layers unique ID
   */
  public getLayerById(layerId: string): BaseLayer {
    const layerGroups = this.getLayerGroupsOfType([
      LayerGroupType.Overlay,
      LayerGroupType.UserNative,
      LayerGroupType.SystemNative,
    ]);
    let layer = null;
    layerGroups.forEach((lg) => {
      const lgLayers = lg.olLayerGroup.getLayers();
      lgLayers.forEach((l) => {
        if (l.get("layerId") == layerId) {
          layer = l;
        }
      });
    });
    return layer;
  }

  /**
   * Gets the layer configuration information (the layer information that is not stored within the OpenLayers layer object) by ID
   * @param layerId The ID of the layer
   * @param layerGroupTypes Array types or types of layer groups to check in
   */
  public getLayerConfigById(
    layerId: string,
    layerGroupTypes: LayerGroupType[] = [
      LayerGroupType.Overlay,
      LayerGroupType.Basemap,
    ]
  ): Layer {
    const layerGroups = this.getLayerGroupsOfType(layerGroupTypes);
    let layer = null;
    layerGroups.forEach((lg) => {
      const lgLayers = lg.layers as Layer[];
      lgLayers.forEach((l) => {
        if (l.id?.toString() == layerId) {
          layer = l;
        }
      });
    });
    return layer;
  }

  /**
   * Creates the scale line control as either a line or bar
   * @param type The type of scale control to create. One of 'bar' or 'line'
   * @returns
   */
  private createScaleLineControl(type: "line" | "bar") {
    return new olControl.ScaleLine({
      units: "metric",
      bar: type === "bar",
      text: true,
      minWidth: 100,
    });
  }

  /**
   * Toggles the existing scale line control between line and bar.
   * This only works for 1 scale control on the map. If multiple scale controls are added, only the first will be toggled
   * @param currentType The current type of scale control. One of 'bar' or 'line'
   */
  private toggleScaleBarType(currentType: "bar" | "line") {
    const newType = currentType === "line" ? "bar" : "line";
    const scaleLineCtrl = this.olMap
      .getControls()
      .getArray()
      .filter((c) => c instanceof olControl.ScaleLine);
    if (scaleLineCtrl.length !== 0) {
      //grab its current location in the document, so we can move it back into the right position
      const currentSiblingElement = document.querySelector(
        `.ol-scale-${currentType}`
      ).previousElementSibling;
      this.olMap.removeControl(scaleLineCtrl[0]);
      const scaleLineControl = this.createScaleLineControl(newType);
      this.olMap.addControl(scaleLineControl);
      //move the element back into position so the tab order isn't messed up
      const newScaleBarEle = document.querySelector(`.ol-scale-${newType}`);
      currentSiblingElement.insertAdjacentElement("afterend", newScaleBarEle);
      setSetting("prefersScaleBar", (newType === "bar").toString());
      //attach new event listener
      this.attachScaleBarSwitcherListener(newType);
    }
  }

  /**
   * Attaches the various listeners required for the scale line functionality
   * @param scaleLineType The type of scale control to create. One of 'bar' or 'line'
   */
  private attachScaleBarSwitcherListener(scaleLineType: "bar" | "line") {
    const scalelineEle = document.querySelector(`.ol-scale-${scaleLineType}`);
    if (!scalelineEle) {
      return;
    }
    (scalelineEle as HTMLElement).title =
      `Change to scale ${scaleLineType === "bar" ? "line" : "bar"}`;
    (scalelineEle as HTMLElement).tabIndex = 0;
    scalelineEle.addEventListener("click", () => {
      this.toggleScaleBarType(scaleLineType);
    });
    scalelineEle.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        this.toggleScaleBarType(scaleLineType);
      }
    });
  }

  /**
   * Checks the size of the map and sets whether the attribution is collapsible or not
   * @param map The map that the attribution is one
   * @param attribution The OpenLayers control
   * @author OpenLayers contributors https://openlayers.org/en/latest/examples/attributions.html
   */
  public checkAttributionSize(
    map: olMap,
    attribution: olControl.Attribution
  ): void {
    const small = map.getSize()[0] < SMALL_MAP_WIDTH_THRESHOLD;
    attribution.setCollapsed(small);
  }

  /**
   * Sets the starting saturation for the currently active basemap
   * @param {number} saturation - The saturation level to set to (0-100)
   */
  public setInitialSaturationOfBasemap(saturation: number): void {
    this.olMap.once("postrender", () => {
      this.setSaturationOfActiveBasemap(saturation, true);
    });
  }

  /**
   * Sets the starting saturation for the passed in layer
   * @param {olLayer.Layer} layer The OpenLayers layer to set the saturation for
   * @param {number} saturation - The saturation level to set to (0-100)
   */
  public setInitialSaturationOfLayer(
    layer: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>,
    saturation: number
  ): void {
    this.olMap.once("postrender", () => {
      this.setLayerSaturation(layer, saturation, true);
    });
  }

  /**
   * Gets the OpenLayers Layer for the currently active basemap
   * */
  public getActiveBasemap(): olLayer.Layer<
    Source,
    LayerRenderer<olLayer.Layer>
  > {
    const baseGroup = this.getLayerGroupOfType(LayerGroupType.Basemap);
    if (baseGroup !== null) {
      return baseGroup.olLayerGroup.getLayersArray().find((l) => {
        return l.getVisible() == true;
      });
    }
  }

  /**
   * Sets the transparency of the currently active basemap
   * @param {number} opacity - The saturation level to set to (0-100)
   * @param {boolean} quiet - Do this without firing any events
   */
  public setTransparencyOfActiveBasemap(
    opacity: number,
    quiet: boolean = false
  ) {
    const olOpacity = opacity / 100;
    const l = this.getActiveBasemap();
    if (l !== null) {
      l.setOpacity(olOpacity);
      if (!quiet) {
        this.delayPermalinkUpdate();
      }
    }
  }

  /**
   * Sets the saturation of the currently active basemap
   * @param {number} saturation - The saturation level to set to (0-100)
   * @param {boolean} quiet - Do this without firing any events
   */
  public setSaturationOfActiveBasemap(
    saturation: number,
    quiet: boolean = false
  ) {
    const l = this.getActiveBasemap();
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
  public setLayerSaturation(
    layer: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>,
    saturation: number,
    quiet: boolean = false
  ) {
    //layers should have custom class names, if it has the default, this is ignored
    const className = layer.getClassName();
    if (className !== "ol-layer") {
      const container: HTMLDivElement = document.querySelector(`.${className}`);
      if (container !== null) {
        const olSaturation = (100 - saturation) / 100;
        container.style.filter = `grayscale(${olSaturation})`;
        layer.set("saturation", saturation, quiet);
        if (!quiet) {
          this.delayPermalinkUpdate();
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
  public setLayerOpacity(
    layer: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>,
    opacity: number
  ) {
    layer.setOpacity(opacity / 100);
    this.delayPermalinkUpdate();
  }

  /**
   * Checks to see if any overlays are currently turned on
   *
   * @returns Boolean indicating whether there are any layers turned on or not
   * */
  public anyOverlaysOn(): boolean {
    const layerGroups = this.getLayerGroupsOfType([
      LayerGroupType.Overlay,
      LayerGroupType.UserNative,
      LayerGroupType.SystemNative,
    ]);

    let layers: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>[] = [];
    layerGroups.forEach((lg) => {
      layers = layers.concat(lg.olLayerGroup.getLayersArray());
    });

    return layers.filter((l) => l.getVisible() === true).length !== 0;
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
    const layerGroups = this.getLayerGroupsOfType([
      LayerGroupType.Overlay,
      LayerGroupType.UserNative,
      LayerGroupType.SystemNative,
    ]);
    let layers: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>[] = [];

    layerGroups.forEach((lg) => {
      layers = layers.concat(lg.olLayerGroup.getLayersArray());
    });

    const layer = layers.filter((l) => l.get("layerId") == layerId)[0];

    layer.setVisible(visibility);
  }

  /**
   * Completely removes a layer from the map by its unique ID
   * @param layerId The unique ID of the layer
   */
  public removeLayerById(layerId: string) {
    const layerGroups = this.getLayerGroupsOfType([
      LayerGroupType.Overlay,
      LayerGroupType.UserNative,
      LayerGroupType.SystemNative,
    ]);
    let removed = false;
    this.config.categories.forEach((c) => {
      const idx = c.layers.findIndex((l) => l.id == layerId);
      if (idx !== -1) {
        c.layers.splice(idx, 1);
      }
    });
    layerGroups.forEach((lg) => {
      if (!removed) {
        const lgLayers = lg.olLayerGroup.getLayers();
        lgLayers.forEach((l) => {
          if (!removed) {
            if (l.get("layerId") == layerId) {
              //remove from map
              this.olMap.removeLayer(l);
              //remove from layer group
              lgLayers.remove(l);
              removed = true;

              const evt = new CustomEvent("gifw-layer-removed", { detail: l });
              this.olMap.getOverlayContainer().dispatchEvent(evt);
            }
          }
        });
      }
    });
  }

  /**
   * Zooms the map to a particular features extent. Will animate the zoom if the extent is in view and the user hasn't enabled Prefers Reduced Motion
   * @param feature The Feature to zoom to
   */
  public zoomToFeature(feature: Feature<Geometry> | RenderFeature) {
    const featureExtent = feature.getGeometry().getExtent();
    this.fitMapToExtent(featureExtent);
  }

  public fitMapToExtent(
    extent: Extent,
    maxZoom: number = 50,
    animationDuration: number = 1000
  ): void {
    const curExtent = this.olMap.getView().calculateExtent();
    if (maxZoom === null) {
      maxZoom = 50;
    }
    if (!PrefersReducedMotion() && containsExtent(curExtent, extent)) {
      this.olMap.getView().fit(extent, {
        padding: this.getPaddingForMapCenter(),
        maxZoom: maxZoom,
        duration: animationDuration,
      });
    } else {
      this.olMap.getView().fit(extent, {
        padding: this.getPaddingForMapCenter(),
        maxZoom: maxZoom,
      });
    }
  }

  /**
   * Gets the percentage of the map that is covered by overlays (left and right panels). Only returns width, does not care about height
   * @returns A number indicating the percentage of the map that is covered by overlays
   */
  public getPercentOfMapCoveredWithOverlays(): number {
    const leftPanelWidth = this.leftSidebarElement.getBoundingClientRect().width;
    const rightPanelWidth = this.rightSidebarElement.getBoundingClientRect().width;
    const screenWidth = this.olMap
      .getOverlayContainer()
      .getBoundingClientRect().width;
    const leftPanelPercentWidth = (leftPanelWidth / screenWidth) * 100;
    const rightPanelPercentWidth = (rightPanelWidth / screenWidth) * 100;
    return leftPanelPercentWidth + rightPanelPercentWidth;
  }

  /**
   * Gets the padding required for view operations to center on the middle of the visible map not including open panels
   * @param defaultPadding Optional default padding to apply. Defaults to 100
   * @returns array of 4 numbers
   */
  public getPaddingForMapCenter(defaultPadding: number = 100): number[] {
    let leftPadding = this.leftSidebarElement.getBoundingClientRect().width;
    let rightPadding = this.rightSidebarElement.getBoundingClientRect().width;
    const screenWidth = this.olMap
      .getOverlayContainer()
      .getBoundingClientRect().width;
    const leftPanelPercentWidth = (leftPadding / screenWidth) * 100;
    if (leftPanelPercentWidth > 50) {
      leftPadding = defaultPadding;
    }
    const rightPanelPercentWidth = (rightPadding / screenWidth) * 100;
    if (rightPanelPercentWidth > 50) {
      rightPadding = defaultPadding;
    }
    return [
      defaultPadding,
      rightPadding + defaultPadding,
      defaultPadding,
      leftPadding + defaultPadding,
    ];
  }

  /**
   * Checks to see if the passed in extent is reachable in the current map, based on both the active basemap and the maps projection
   * @param extent The Extent to check
   * @returns Boolean, true if extent is reachable, false otherwise
   */
  public isExtentAvailableInCurrentMap(extent: Extent): boolean {
    const activeBasemap = this.getActiveBasemap();
    const reprojectedExtent = olProj.transformExtent(
      extent,
      this.olMap.getView().getProjection(),
      "EPSG:4326"
    );
    const maxBasemapExtent = olProj.transformExtent(
      activeBasemap.getExtent(),
      this.olMap.getView().getProjection(),
      "EPSG:4326"
    );
    const maxMapProjectionExtent = this.olMap
      .getView()
      .getProjection()
      .getWorldExtent();
    const withinBasemapExtent = containsExtent(
      maxBasemapExtent,
      reprojectedExtent
    );
    const withinMapProjectionExtent = containsExtent(
      maxMapProjectionExtent,
      reprojectedExtent
    );
    return withinBasemapExtent && withinMapProjectionExtent;
  }

  /**
   * Returns a boolean indicating if the layer has a filter applied to it
   * A 'user editable' filter is one they have either applied themselves, or a default one
   * (applied by admins) that the user is allowed to modify
   * @param layer The layer configuration information
   * @param olLayer The OpenLayers layer
   * @param userEditableOnly If true, will return true if a CQL filter is applied AND the user is able to edit it
   * @return Boolean indicating if it does have a filter applied
   */
  public getLayerFilteredStatus(
    layer: Layer,
    olLayer: olLayer.Layer,
    userEditableOnly: boolean = true
  ): boolean {
    if (olLayer.get("gifw-filter-applied")) {
      return true;
    }
    const source = olLayer.getSource();
    if (source instanceof TileWMS || source instanceof ImageWMS) {
      const params = (source as TileWMS | ImageWMS).getParams();
      let cqlFilter: string;
      for (const property in params) {
        if (property.toLowerCase() === "cql_filter") {
          cqlFilter = params[property];
        }
      }

      if (cqlFilter) {
        if (userEditableOnly) {
          return layer.defaultFilterEditable;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Gets all Legend URLs for layers that are legendable, and a list of layer names that are not legendable
   * @param countMatched Set the countMatched parameter for WMS legends
   * @param colorMode The color mode to render the legend as (dark or light)
   * @param textWrapLimit The text wrapping limit in pixels for WMS legends
   * @returns LegendURLs
   */
  public async getLegendURLs(countMatched: boolean = true, colorMode: 'dark' | 'light', textWrapLimit?: number) {
    const legends: LegendURLs = {
      availableLegends: [],
      nonLegendableLayers: [],
    };
    let wmsLegendOptions = `fontAntiAliasing:true;forceLabels:on;countMatched:${countMatched};hideEmptyRules:true;`
    if (textWrapLimit != undefined) {
      wmsLegendOptions += `wrap:true;wrap_limit:${textWrapLimit};`
    }
    if (colorMode === 'dark') {
      wmsLegendOptions += "bgColor:0x212529;fontColor:0xFFFFFF;";
    }

    if (this.anyOverlaysOn()) {
      const resolution = this.olMap.getView().getResolution();
      const roundedZoom = Math.ceil(this.olMap.getView().getZoom());
      const layerGroups = this.getLayerGroupsOfType([
        LayerGroupType.Overlay,
        LayerGroupType.UserNative,
        LayerGroupType.SystemNative,
      ]);

      let layers: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>[] = [];
      layerGroups.forEach((lg) => {
        layers = layers.concat(lg.olLayerGroup.getLayersArray());
      });

      const switchedOnLayers = layers.filter(
        (l) =>
          l.getVisible() === true &&
          l.getMaxZoom() >= roundedZoom &&
          l.getMinZoom() < roundedZoom
      );
      
      const sortedLayers = switchedOnLayers
        .sort((a, b) => a.getZIndex() - b.getZIndex())
        .reverse();
        
      for (const l of sortedLayers) {
        const source = l.getSource();
        if (source instanceof TileWMS || source instanceof ImageWMS) {
          const view = this.olMap.getView();
          const viewport = this.olMap.getViewport();
          //version is forced to 1.1.0 to get around lat/lon flipping issues
          let params = {
            LEGEND_OPTIONS: wmsLegendOptions,
            bbox: view.calculateExtent().toString(),
            srcwidth: viewport.clientWidth,
            srcheight: viewport.clientHeight,
            srs: view.getProjection().getCode(),
            version: "1.1.0",
          };
          //merge valid params from the source and add to the legend
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Disabled to make make handling this generic object easier. The code is safe as written
          let additionalParams: any = {};
          const sourceParams = source.getParams();

          const validProps = [
            "time",
            "cql_filter",
            "filter",
            "featureid",
            "elevation",
            "styles",
            "authkey",
          ];
          //For the sake of sanity, convert the param names to lowercase for processing
          const lowerCaseParams = Object.fromEntries(
            Object.entries(sourceParams).map(([k, v]) => [k.toLowerCase(), v])
          );
          additionalParams = Object.fromEntries(
            Object.entries(lowerCaseParams).filter(([key]) =>
              validProps.includes(key)
            )
          );
          if (additionalParams?.styles) {
            //in WMS GetMap, we use the paramater 'STYLES'. In a GetLegendGraphic, we need to use 'STYLE'
            //so we detect and convert it here, and get rid of the old one
            additionalParams.style = additionalParams.styles;
            delete additionalParams.styles;
          }
          params = { ...params, ...additionalParams };

          const legendUrl = source.getLegendUrl(resolution, params);
          const layerConfig = this.getLayerConfigById(l.get("layerId"));
          const headers = extractCustomHeadersFromLayerSource(
            layerConfig.layerSource
          );
          this.authManager.applyAuthenticationToRequestHeaders(
            legendUrl,
            headers
          );
          const legendInfo = {
            name: (l.get("name") as string).trim(),
            legendUrl: legendUrl,
            headers: headers,
          };
          legends.availableLegends.push(legendInfo);
        } else if (source instanceof VectorSource) {
          //get style option from layer
          const layerId = l.get("layerId");
          const layer = this.getLayerConfigById(layerId, [LayerGroupType.Overlay]);
          if (layer) {
            const cacheKey = `${layerId}-${colorMode}`;

            // Check cache first
            if (this.vectorLegendCache.has(cacheKey)) {
              const legendInfo = {
                name: (l.get("name") as string).trim(),
                legendUrl: this.vectorLegendCache.get(cacheKey),
                headers: new Headers(),
              };
              legends.availableLegends.push(legendInfo);
              continue; // Skip to next layer
            }

            const styleOpt = getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "style");
            if (styleOpt) {
              try {
                let styleJson = styleOpt;
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
                const parsedStyle = JSON.parse(styleJson);

                // Create a temporary container div for the legend renderer
                const tempContainer = document.createElement('div');
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-9999px';
                tempContainer.style.top = '-9999px';
                tempContainer.style.width = '600px';
                tempContainer.style.background = 'white';
                document.body.appendChild(tempContainer);

                // Use large initial size to accommodate all content
                const legendRenderer = new LegendRenderer({
                  maxColumnWidth: 600,
                  maxColumnHeight: 1000,
                  overflow: 'auto',
                  styles: [parsedStyle],
                  size: [600, 1000],
                  iconSize: [20, 20],
                  legendItemTextSize: 14,
                  hideRect: true
                });

                await legendRenderer.render(tempContainer);

                // Check if we have any SVG content
                const svgElements = tempContainer.getElementsByTagName('svg');

                if (svgElements.length > 0) {
                  const svgElement = svgElements[0];

                  // Customize the SVG text elements
                  this.customizeLegendSVG(svgElement, colorMode === 'dark' ? '#ffffff' : '#000000');

                  // Resize SVG to actual content size
                  this.resizeSVGToContent(svgElement);

                  // Serialize the modified SVG
                  const svgData = new XMLSerializer().serializeToString(svgElement);
                  const legendDataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

                  document.body.removeChild(tempContainer);

                  // Cache the generated legend
                  this.vectorLegendCache.set(cacheKey, legendDataUri);

                  const legendInfo = {
                    name: (l.get("name") as string).trim(),
                    legendUrl: legendDataUri,
                    headers: new Headers(),
                  };

                  legends.availableLegends.push(legendInfo);

                } else {
                  document.body.removeChild(tempContainer);
                  legends.nonLegendableLayers.push((l.get("name") as string).trim());
                }
              } catch (error) {
                console.error(`Failed to generate legend for layer ${l.get("name")}:`, error);
                legends.nonLegendableLayers.push((l.get("name") as string).trim());
              }
            } else {
              //no style opt, might be using a default style
              legends.nonLegendableLayers.push((l.get("name") as string).trim());
            }
          } else {
            //couldn't find layer from overlay list. Might be an annotation or user added layer
            legends.nonLegendableLayers.push((l.get("name") as string).trim());
          }
        } else {
          legends.nonLegendableLayers.push((l.get("name") as string).trim());
        }
      }
    }
    return legends;
  }

  /**
   * Customizes the styling of a legend SVG element
   * @param svgElement The SVG element to customize
   */
  private customizeLegendSVG(svgElement: SVGSVGElement, fontColor: string): void {
    // Find all text elements in the SVG
    const textElements = svgElement.querySelectorAll('text');
    
    textElements.forEach((textElement) => {
      // Set font family
      textElement.setAttribute('font-family', 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
      
      // Set font weight
      textElement.setAttribute('font-weight', '400');
      
      // Set text color (fill)
      textElement.setAttribute('fill', fontColor);
      
    });
  }

  /**
   * Resizes an SVG element to fit its actual content with optional padding
   * @param svgElement The SVG element to resize
   * @param padding Optional padding to add around the content (default: 5)
   */
  private resizeSVGToContent(svgElement: SVGSVGElement, padding: number = 5): void {
    try {
      // Get the bounding box of all content in the SVG
      const bbox = svgElement.getBBox();
      
      // Calculate new dimensions with padding
      const newWidth = Math.ceil(bbox.width + bbox.x + padding * 2);
      const newHeight = Math.ceil(bbox.height + bbox.y + padding * 2);
      
      // Set minimum sizes to avoid tiny legends
      const minWidth = 100;
      const minHeight = 30;
      
      const finalWidth = Math.max(newWidth, minWidth);
      const finalHeight = Math.max(newHeight, minHeight);
      
      // Update SVG dimensions
      svgElement.setAttribute('width', finalWidth.toString());
      svgElement.setAttribute('height', finalHeight.toString());
      svgElement.setAttribute('viewBox', `0 0 ${finalWidth} ${finalHeight}`);
      
      // Also update the background rect if it exists
      const backgroundRect = svgElement.querySelector('rect');
      if (backgroundRect) {
        backgroundRect.setAttribute('width', finalWidth.toString());
        backgroundRect.setAttribute('height', finalHeight.toString());
      }
    } catch (error) {
      console.warn('Could not resize SVG to content:', error);
      // If getBBox fails, leave the SVG at its original size
    }
  }

  /**
   * Disables the context menu
   */
  public disableContextMenu() {
    this.mapElement.classList.add("context-menu-disabled");
  }

  /**
   * Enables the context menu
   */
  public enableContextMenu() {
    this.mapElement.classList.remove("context-menu-disabled");
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
    this.mapElement.dispatchEvent(new Event("gifw-measure-deactivate"));
    this.mapElement.dispatchEvent(new Event("gifw-annotate-deactivate"));
    this.mapElement.dispatchEvent(new Event("gifw-feature-query-deactivate"));
  }

  /**
   * Resets all interactions to their starting defaults by dispatching a list of known events
   */
  public resetInteractionsToDefault() {
    this.mapElement.dispatchEvent(new Event("gifw-measure-deactivate"));
    this.mapElement.dispatchEvent(new Event("gifw-annotate-deactivate"));
    this.mapElement.dispatchEvent(new Event("gifw-feature-query-activate"));
  }

  /**
   * Opens a sidebar by its unique ID
   * @param id The unique ID of the sidebar
   */
  public openSidebarById(id: string) {
    const matchedSidebar = this.sidebars.filter((s) => s.id === id);
    if (matchedSidebar.length === 1) {
      matchedSidebar[0].open();
    } else {
      console.warn(`Sidebar with ID ${id} not found or more than one found`);
    }
  }

  public createProxyURL(url: string) {
    return `${document.location.protocol}//${this.config.appRoot
      }proxy?url=${encodeURIComponent(url)}`;
  }
}

// Constants for better maintainability
const DEFAULT_ZOOM = 10;
const DEFAULT_CENTER = [50.7621, -2.3314];
const DEFAULT_ROTATION = 0;
const DEFAULT_CRS = 4326;
const DEFAULT_MAX_ZOOM = 22;
const DEFAULT_MIN_ZOOM = 0;
const AUTH_TOKEN_REFRESH_INTERVAL = 120000; // 2 minutes
const SMALL_MAP_WIDTH_THRESHOLD = 600;
