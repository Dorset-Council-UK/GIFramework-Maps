import { Control as olControl } from "ol/control";
import { Draw, Modify, Select } from "ol/interaction";
import { transform } from "ol/proj";
import { GIFWMap } from "../Map";
import { CesiumTerrainClick } from "../Cesium3DControl";
import { FeatureQueryContext, FeatureQuerySearch } from "./FeatureQuerySearch";

type FeatureQueryMode = "point" | "area" | "buffer" | "inactive";

export class FeatureQuery extends olControl {
  gifwMapInstance: GIFWMap;
  pointActive: boolean;
  polygonActive: boolean;
  bufferActive: boolean;
  _featureQuerySearch: FeatureQuerySearch;
  _maxTimeout: number;
  _infoPointControlElement: HTMLElement;
  _infoAreaControlElement: HTMLElement;
  _infoBufferControlElement: HTMLElement;
  _infoToggleControlElement: HTMLElement;
  _keyboardEventAbortController: AbortController;
  private is3DMode = false;
  private modeBefore3D: FeatureQueryMode = "point";
  private unsubscribeFromTerrainClick: (() => void) | undefined;

  constructor(gifwMapInstance: GIFWMap, active: boolean = true) {
    const infoControlElement = document.createElement("div");

    super({
      element: infoControlElement,
    });

    this.gifwMapInstance = gifwMapInstance;
    this.pointActive = active;
    this.polygonActive = false;
    this.bufferActive = false;
    this._maxTimeout = 10000;
    this.renderInfoSearchControls();
    this.addUIEvents();
  }

  init() {
    this._featureQuerySearch = new FeatureQuerySearch(this.gifwMapInstance);
    this.gifwMapInstance.olMap.on("click", (evt) => {
      // Inhibit click interaction if actively drawing, modifying or selecting features
      let inhibit = false;
      this.gifwMapInstance.olMap
        .getInteractions()
        .getArray()
        .forEach((i) => {
          if (i instanceof Draw || i instanceof Select || i instanceof Modify) {
            if (i.getActive()) {
              inhibit = true;
            }
          }
        });
      if (inhibit) {
        return;
      }
      if (this.pointActive && !this.is3DMode) {
        this._featureQuerySearch.doInfoSearch(evt.coordinate, evt.pixel);
      } else if (this.bufferActive) {
        this._featureQuerySearch.doBufferSearch(evt.coordinate);
      }
    });

    const mapContainer = document.getElementById(this.gifwMapInstance.id);
    mapContainer.addEventListener("gifw-feature-query-deactivate", () => {
      this.deactivate();
    });
    mapContainer.addEventListener("gifw-feature-query-activate", () => {
      document
        .getElementById(this.gifwMapInstance.id)
        .dispatchEvent(new Event("gifw-info-point-activate"));
    });

    mapContainer.addEventListener("gifw-info-point-activate", () => {
      this.activatePointSearch();
    });

    mapContainer.addEventListener("gifw-info-area-activate", () => {
      this.activateAreaSearch();
    });

    mapContainer.addEventListener("gifw-info-buffer-activate", () => {
      this.activateBufferSearch();
    });
  }

  public set3DMode(enabled: boolean): void {
    if (enabled === this.is3DMode) {
      return;
    }

    this.is3DMode = enabled;
    if (enabled) {
      this.modeBefore3D = this.getActiveMode();
      this.deactivate();
      this.pointActive = true;
      this.element.hidden = true;
      this.unsubscribeFromTerrainClick = this.gifwMapInstance
        .getCesium3DControl()
        ?.onTerrainClick((click) => this.handle3DTerrainClick(click));
      return;
    }

    this.unsubscribeFromTerrainClick?.();
    this.unsubscribeFromTerrainClick = undefined;
    this.element.hidden = false;
    this.restoreModeAfter3D();
  }

  private handle3DTerrainClick(click: CesiumTerrainClick): void {
    const view = this.gifwMapInstance.olMap.getView();
    const coordinate = transform(
      [click.longitude, click.latitude],
      "EPSG:4326",
      view.getProjection(),
    );
    const pickedPrimitive = (click.pickedObject as {
      primitive?: {
        olFeature?: FeatureQueryContext["pickedFeature"];
        olLayer?: FeatureQueryContext["pickedLayer"];
      };
    } | undefined)?.primitive;

    this._featureQuerySearch.doInfoSearch({
      coordinate,
      pixel: this.gifwMapInstance.olMap.getPixelFromCoordinate(coordinate),
      pickedFeature: pickedPrimitive?.olFeature,
      pickedLayer: pickedPrimitive?.olLayer,
    });
  }

  private getActiveMode(): FeatureQueryMode {
    if (this.polygonActive) {
      return "area";
    }
    if (this.bufferActive) {
      return "buffer";
    }
    return this.pointActive ? "point" : "inactive";
  }

  private restoreModeAfter3D(): void {
    switch (this.modeBefore3D) {
      case "area":
        this.activateAreaSearch();
        break;
      case "buffer":
        this.activateBufferSearch();
        break;
      case "inactive":
        this.deactivate();
        break;
      default:
        this.activatePointSearch();
        break;
    }
  }

  private renderInfoSearchControls() {
    const infoButton = document.createElement("button");
    infoButton.innerHTML = `<i class="bi bi-info-circle"></i>`;
    infoButton.setAttribute("title", "Open info search controls");
    const infoButtonElement = document.createElement("div");
    infoButtonElement.className =
      "gifw-info-control ol-unselectable ol-control";
    infoButtonElement.appendChild(infoButton);

    const infoPointButton = document.createElement("button");
    infoPointButton.innerHTML = `<img src="${document.location.protocol}//${this.gifwMapInstance.config.appRoot}img/svg-icons/feature-query-point-icon.svg" alt="Click to query features icon" />`;
    infoPointButton.setAttribute("title", "Query features by clicking");
    const infoPointElement = document.createElement("div");
    infoPointElement.className =
      "gifw-info-point-control gifw-info-control ol-unselectable ol-control ol-hidden ol-control-active";
    infoPointElement.appendChild(infoPointButton);

    const infoAreaButton = document.createElement("button");
    infoAreaButton.innerHTML = '<i class="bi bi-pentagon"></i>';
    infoAreaButton.setAttribute("title", "Query features by drawing a polygon");
    const infoAreaElement = document.createElement("div");
    infoAreaElement.className =
      "gifw-info-polygon-control gifw-info-control ol-unselectable ol-control ol-hidden";
    infoAreaElement.appendChild(infoAreaButton);

    const infoBufferButton = document.createElement("button");
    infoBufferButton.innerHTML = '<i class="bi bi-circle"></i>';
    infoBufferButton.setAttribute("title", "Query features by a buffer");
    const infoBufferElement = document.createElement("div");
    infoBufferElement.className =
      "gifw-info-buffer-control gifw-info-control ol-unselectable ol-control ol-hidden";
    infoBufferElement.appendChild(infoBufferButton);

    this.element.appendChild(infoButtonElement);
    this.element.appendChild(infoPointElement);
    this.element.appendChild(infoAreaElement);
    this.element.appendChild(infoBufferElement);
    this._infoPointControlElement = infoPointElement;
    this._infoAreaControlElement = infoAreaElement;
    this._infoBufferControlElement = infoBufferElement;
    this._infoToggleControlElement = infoButtonElement;
  }

  private addUIEvents() {
    const infoButton = this._infoToggleControlElement.querySelector("button");
    const infoPointButton =
      this._infoPointControlElement.querySelector("button");
    const infoAreaButton = this._infoAreaControlElement.querySelector("button");
    const infoBufferButton =
      this._infoBufferControlElement.querySelector("button");

    infoButton.addEventListener("click", () => {
      //toggle visibility of sub controls
      if (this._infoPointControlElement.classList.contains("ol-hidden")) {
        //show controls
        this._infoPointControlElement.classList.remove("ol-hidden");
        this._infoAreaControlElement.classList.remove("ol-hidden");
        this._infoBufferControlElement.classList.remove("ol-hidden");
        infoButton.innerHTML = `<i class="bi bi-chevron-double-left"></i>`;
        infoButton.setAttribute("title", "Collapse query controls");
      } else {
        this._infoPointControlElement.classList.add("ol-hidden");
        this._infoAreaControlElement.classList.add("ol-hidden");
        this._infoBufferControlElement.classList.add("ol-hidden");
        infoButton.innerHTML = `<i class="bi bi-info-circle"></i>`;
        infoButton.setAttribute("title", "Open query controls");
      }
      infoButton.blur();
    });

    infoPointButton.addEventListener("click", () => {
      if (
        this._infoPointControlElement.classList.contains("ol-control-active")
      ) {
        //deactivate
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-info-point-deactivate"));
        infoPointButton.blur();
      } else {
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-info-point-activate"));
      }
    });

    infoAreaButton.addEventListener("click", () => {
      if (
        this._infoAreaControlElement.classList.contains("ol-control-active")
      ) {
        //deactivate
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-info-area-deactivate"));
        infoAreaButton.blur();
      } else {
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-info-area-activate"));
      }
    });

    infoBufferButton.addEventListener("click", () => {
      if (
        this._infoBufferControlElement.classList.contains("ol-control-active")
      ) {
        //deactivate
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-info-buffer-deactivate"));
        infoBufferButton.blur();
      } else {
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-info-buffer-activate"));
      }
    });
  }

  public activatePointSearch() {
    this._featureQuerySearch._drawControl?.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(
      this._featureQuerySearch._drawControl,
    );
    this.gifwMapInstance.deactivateInteractions();
    //this.gifwMapInstance.hidePopup();
    //add ol-control-active class
    this._infoPointControlElement.classList.add("ol-control-active");
    //remove ol-control-active class from other tools
    this._infoAreaControlElement.classList.remove("ol-control-active");
    this._infoBufferControlElement.classList.remove("ol-control-active");

    this.pointActive = true;
    this.bufferActive = false;
    this.polygonActive = false;
  }
  public activateAreaSearch() {
    this.gifwMapInstance.deactivateInteractions();
    this.gifwMapInstance.hidePopup();
    //add ol-control-active class
    this._infoAreaControlElement.classList.add("ol-control-active");
    //remove ol-control-active class from other tools
    this._infoPointControlElement.classList.remove("ol-control-active");
    this._infoBufferControlElement.classList.remove("ol-control-active");

    this.pointActive = false;
    this.bufferActive = false;
    this.polygonActive = true;

    this._featureQuerySearch.activateAreaQueryDrawing();
  }
  public activateBufferSearch() {
    this._featureQuerySearch._drawControl?.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(
      this._featureQuerySearch._drawControl,
    );
    this.gifwMapInstance.deactivateInteractions();
    this.gifwMapInstance.hidePopup();
    //add ol-control-active class
    this._infoBufferControlElement.classList.add("ol-control-active");
    //remove ol-control-active class from other tools
    this._infoPointControlElement.classList.remove("ol-control-active");
    this._infoAreaControlElement.classList.remove("ol-control-active");

    this.pointActive = false;
    this.polygonActive = false;
    this.bufferActive = true;
  }

  public deactivate() {
    this._featureQuerySearch._drawControl?.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(
      this._featureQuerySearch._drawControl,
    );

    //remove ol-control-active class from other tools
    this._infoPointControlElement.classList.remove("ol-control-active");
    this._infoAreaControlElement.classList.remove("ol-control-active");
    this._infoBufferControlElement.classList.remove("ol-control-active");

    this.pointActive = false;
    this.bufferActive = false;
    this.polygonActive = false;
  }
}
