import { Control as olControl } from "ol/control";
import { Snap } from "ol/interaction";
import { Feature } from "ol";
import { Circle, Geometry, SimpleGeometry } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import { getLength } from "ol/sphere";
import { Style } from "ol/style";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { GIFWMap } from "../Map";
import { Measure } from "../Measure";
import { GIFWPopupAction } from "../Popups/PopupAction";
import { GIFWPopupOptions } from "../Popups/PopupOptions";
import AnnotationActivateEvent from "./AnnotationActivateEvent";
import AnnotationDraw from "./AnnotationDraw";
import AnnotationExport from "./AnnotationExport";
import AnnotationSelect from "./AnnotationSelect";
import AnnotationSource from "./AnnotationSource";
import AnnotationStyle from "./AnnotationStyle";
import AnnotationStyleEvent from "./AnnotationStyleEvent";
import {
    AnnotationTool,
    BufferTool,
    CircleTool,
    LineTool,
    PointTool,
    PolygonTool,
    TextTool,
} from "./AnnotationTool";

export default class Annotate extends olControl {
  gifwMapInstance: GIFWMap;
  activeStyle: AnnotationStyle;
  annotationLayer: VectorLayer;
  annotationTools: AnnotationTool[];
  drawInteraction: AnnotationDraw;
  exporter: AnnotationExport;
  selectInteraction: AnnotationSelect;
  snapInteraction: Snap;
  _keyboardEventAbortController: AbortController;
  _exportAnnotationControlElement: HTMLElement;
  _clearAnnotationControlElement: HTMLElement;
  _modifyAnnotationControlElement: HTMLElement;

  constructor(gifwMapInstance: GIFWMap) {
    super({
      element: document.createElement("div"),
    });
    this.gifwMapInstance = gifwMapInstance;
  }

  // Call once the GIFW map is ready to add layers and interactions
  public init() {
    this.activeStyle = new AnnotationStyle(this.gifwMapInstance);
    this.annotationLayer = this.gifwMapInstance.addNativeLayerToMap(
      new AnnotationSource(),
      "Annotations",
      this.activeStyle,
      false,
      LayerGroupType.SystemNative,
      undefined,
      undefined,
      "__annotations__",
    );
    this.exporter = new AnnotationExport(
      this.annotationLayer.getSource(),
      this.gifwMapInstance,
    );
    this.renderAnnotationControls();
    this.setListeners();
  }

  private renderAnnotationControls() {
    const annotateButton = document.createElement("button");
    annotateButton.innerHTML = '<i class="bi bi-pencil"></i>';
    annotateButton.setAttribute("title", "Open annotation controls");
    const annotateContainer = document.createElement("div");
    annotateContainer.className =
      "gifw-annotation-control ol-unselectable ol-control";
    annotateContainer.appendChild(annotateButton);
    this.element.appendChild(annotateContainer);

    this.annotationTools = [
      PolygonTool,
      LineTool,
      PointTool,
      CircleTool,
      BufferTool,
      TextTool,
    ];

    const exportButton = document.createElement("button");
    exportButton.innerHTML = '<i class="bi bi-save"></i>';
    exportButton.setAttribute("title", "Export annotations");
    const exportContainer = document.createElement("div");
    exportContainer.className =
      "gifw-export-annotation-control gifw-annotation-control ol-unselectable ol-control ol-hidden";
    exportContainer.appendChild(exportButton);
    this.element.appendChild(exportContainer);
    exportButton.addEventListener("click", () => {
      this.gifwMapInstance.resetInteractionsToDefault();
      exportButton.blur();
      if (this.annotationLayer.getSource().getFeatures().length === 0) {
        alert("You don't have any annotations to export!");
      } else {
        this.exporter.showOptions();
      }
    });

    const modifyButton = document.createElement("button");
    modifyButton.innerHTML = '<i class="bi bi-brush-fill"></i>';
    modifyButton.setAttribute("title", "Modify annotations");
    const modifyContainer = document.createElement("div");
    modifyContainer.className =
      "gifw-modify-annotation-control gifw-annotation-control ol-unselectable ol-control ol-hidden";
    modifyContainer.appendChild(modifyButton);
    this.element.appendChild(modifyContainer);
    modifyButton.addEventListener("click", () => {
      if (modifyContainer.classList.contains("ol-control-active")) {
        this.gifwMapInstance.resetInteractionsToDefault();
        modifyContainer.classList.remove("ol-control-active");
        modifyButton.blur();
      } else {
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new CustomEvent("gifw-annotate-deactivate"));
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new CustomEvent("gifw-annotate-modify"));
        modifyContainer.classList.add("ol-control-active");
      }
    });

    const clearAnnotationsButton = document.createElement("button");
    clearAnnotationsButton.innerHTML = '<i class="bi bi-trash"></i>';
    clearAnnotationsButton.setAttribute("title", "Delete all annotations");
    const clearAnnotationsContainer = document.createElement("div");
    clearAnnotationsContainer.className =
      "gifw-clear-annotation-control gifw-annotation-control ol-unselectable ol-control ol-hidden";
    clearAnnotationsContainer.appendChild(clearAnnotationsButton);
    this.element.appendChild(clearAnnotationsContainer);
    clearAnnotationsButton.addEventListener("click", () => {
      this.gifwMapInstance.resetInteractionsToDefault();
      clearAnnotationsButton.blur();
      if (this.annotationLayer.getSource().getFeatures().length === 0) {
        alert("You don't have any annotations to clear!");
      } else {
        if (confirm("Are you sure you want to delete all annotations?")) {
          this.annotationLayer.getSource().clear();
          this.annotationLayer.setVisible(false);
        }
      }
    });

    this._exportAnnotationControlElement = exportContainer;
    this._modifyAnnotationControlElement = modifyContainer;
    this._clearAnnotationControlElement = clearAnnotationsContainer;
    if (
      this.annotationLayer.getSource().getFeatures().length === 0
    ) {
      this._exportAnnotationControlElement
        .querySelector("button")
        .setAttribute("disabled", "");
      this._modifyAnnotationControlElement
        .querySelector("button")
        .setAttribute("disabled", "");
      this._clearAnnotationControlElement
        .querySelector("button")
        .setAttribute("disabled", "");
    }

    this.annotationTools.forEach((tool) => {
      this.element.appendChild(tool.buttonContainer);
      tool.button.addEventListener("click", () => {
        if (tool.buttonContainer.classList.contains("ol-control-active")) {
          this.gifwMapInstance.resetInteractionsToDefault();
          tool.button.blur();
        } else {
          document.getElementById(this.gifwMapInstance.id).dispatchEvent(
            new CustomEvent("gifw-annotate-activate", {
              detail: {
                tool: tool,
              },
            }) as AnnotationActivateEvent,
          );
          modifyContainer.classList.remove("ol-control-active");
        }
      });
    });

    annotateButton.addEventListener("click", () => {
      const containers: HTMLDivElement[] = [];
      this.annotationTools.forEach((tool) => {
        containers.push(tool.buttonContainer);
      });
      // Toggle visibility of sub controls
      if (containers[0].classList.contains("ol-hidden")) {
        // Show controls
        containers.forEach((c) => {
          c.classList.remove("ol-hidden");
        });
        exportContainer.classList.remove("ol-hidden");
        modifyContainer.classList.remove("ol-hidden");
        clearAnnotationsContainer.classList.remove("ol-hidden");
        annotateButton.innerHTML = `<i class="bi bi-chevron-double-left"></i>`;
        annotateButton.setAttribute("title", "Collapse annotation controls");
      } else {
        containers.forEach((c) => {
          c.classList.add("ol-hidden");
        });
        exportContainer.classList.add("ol-hidden");
        modifyContainer.classList.add("ol-hidden");
        clearAnnotationsContainer.classList.add("ol-hidden");
        annotateButton.innerHTML = '<i class="bi bi-pencil"></i>';
        annotateButton.setAttribute("title", "Open annotation controls");
        this.gifwMapInstance.resetInteractionsToDefault();
      }
      annotateButton.blur();
    });
  }

  private setListeners() {
    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener(
        "gifw-annotate-activate",
        (e: AnnotationActivateEvent) => {
          this.gifwMapInstance.deactivateInteractions();
          this.gifwMapInstance.hidePopup();
          this.activate(e.detail.tool);
        },
      );

    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-annotate-deactivate", () => {
        this.deactivate();
      });

    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-annotate-modify", () => {
        this.activateModifications();
      });

    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener(
        "gifw-annotate-style-update",
        (e: AnnotationStyleEvent) => {
          this.activeStyle = new AnnotationStyle(this.gifwMapInstance);
          this.activeStyle.rebuildFromEvent(e);
          if (this.drawInteraction.getActive()) {
            this.drawInteraction.setActive(false);
            this.gifwMapInstance.olMap.removeInteraction(this.drawInteraction);
            this.drawInteraction = new AnnotationDraw(
              this.activeStyle.activeTool.olDrawType,
              this.annotationLayer,
              this.activeStyle,
            );
            this.gifwMapInstance.olMap.addInteraction(this.drawInteraction);
            this.drawInteraction.setActive(true);
          }
          if (this.selectInteraction?.getActive()) {
            this.selectInteraction.restyleFeatures(this.activeStyle);
          }
        },
      );

    this.annotationLayer.on("change", () => {
      if (this.annotationLayer.getSource().getFeatures().length === 0) {
        this._exportAnnotationControlElement
          .querySelector("button")
          .setAttribute("disabled", "");
        this._modifyAnnotationControlElement
          .querySelector("button")
          .setAttribute("disabled", "");
        this._clearAnnotationControlElement
          .querySelector("button")
          .setAttribute("disabled", "");
      } else {
        this._exportAnnotationControlElement
          .querySelector("button")
          .removeAttribute("disabled");
        this._modifyAnnotationControlElement
          .querySelector("button")
          .removeAttribute("disabled");
        this._clearAnnotationControlElement
          .querySelector("button")
          .removeAttribute("disabled");
      }
    });
  }

  private activate(tool: AnnotationTool) {
    if (tool.name != "Point" && tool.name != "Text") {
      /*enable esc to cancel*/
      this._keyboardEventAbortController = new AbortController();
      document.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "Escape") {
            this.drawInteraction.abortDrawing();
          } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
            this.drawInteraction.removeLastPoint();
          }
        },
        { signal: this._keyboardEventAbortController.signal },
      );
      this.gifwMapInstance.olMap.getTargetElement().style.cursor = "crosshair";
    }
    this.gifwMapInstance.disableContextMenu();
    tool.buttonContainer.classList.add("ol-control-active");
    tool.button.setAttribute("title", "Stop drawing");
    this.activeStyle = this.activeStyle.getClone(); // clone the active style so as not to unintentionally restyle existing features
    this.activeStyle.rebuildForTool(tool);
    this.drawInteraction = new AnnotationDraw(
      tool.olDrawType,
      this.annotationLayer,
      this.activeStyle,
    );
    this.snapInteraction = new Snap({
      source: this.annotationLayer.getSource(),
    });
    this.gifwMapInstance.olMap.addInteraction(this.drawInteraction);
    this.gifwMapInstance.olMap.addInteraction(this.snapInteraction);
    this.drawInteraction.setActive(true);
    this.snapInteraction.setActive(true);
    document.getElementById(this.gifwMapInstance.id).dispatchEvent(
      new CustomEvent("gifw-annotate-update-panel", {
        detail: {
          style: this.activeStyle,
        },
      }) as AnnotationStyleEvent,
    );
  }

  private deactivate() {
    this._keyboardEventAbortController?.abort();
    this.gifwMapInstance.olMap.getTargetElement().style.cursor = "auto";
    this.annotationTools.forEach((tool) => {
      tool.buttonContainer.classList.remove("ol-control-active");
      tool.button.setAttribute("title", tool.buttonTitle);
    });
    this.gifwMapInstance.enableContextMenu();
    this.drawInteraction?.setActive(false);
    this.snapInteraction?.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(this.drawInteraction);
    this.gifwMapInstance.olMap.removeInteraction(this.snapInteraction);
    this.selectInteraction?.deactivate();
  }

  private activateModifications() {
    this.selectInteraction = new AnnotationSelect(
      this.gifwMapInstance,
      this.annotationLayer
    );
  }

  public static updatePopupForAnnotation(annotationType: string, feature: Feature, layer: VectorLayer) {
    const popupText = this.getPopupTextForFeature(annotationType, feature);
    this.addPopupOptionsToFeature(feature, layer, popupText);
  }

  private static addPopupOptionsToFeature(
    feature: Feature<Geometry>,
    annotationLayer: VectorLayer,
    popupContent: string,
  ) {
    const removeAction = new GIFWPopupAction(
      "Remove drawing",
      () => {
        annotationLayer.getSource().removeFeature(feature);
        if (annotationLayer.getSource().getFeatures().length === 0) {
          annotationLayer.setVisible(false);
        }
      },
      true,
      true,
    );
    const removeAllAction = new GIFWPopupAction(
      "Remove all drawings",
      () => {
        annotationLayer.getSource().clear();
        annotationLayer.setVisible(false);
      },
      true,
      true,
    );
    const popupOpts = new GIFWPopupOptions(popupContent, [
      removeAction,
      removeAllAction,
    ]);
    feature.set("gifw-popup-opts", popupOpts);
  }

  private static getPopupTextForFeature(annotationType: string, feature: Feature) {
    const timestamp = new Date().toLocaleString();
    const geometry = feature.getGeometry();
    const bufferDistance = feature.get('gifw-annotations-buffer-radius-number');
    const bufferUnit = feature.get('gifw-annotations-buffer-radius-unit');
    let coordinates;
    if (annotationType === "Circle") {
      coordinates = (geometry as Circle).getCenter();
    } else {
      coordinates = (geometry as SimpleGeometry).getCoordinates();
    }
    const firstCoordinate = coordinates[0] as number;
    const secondCoordinate = coordinates[1] as number;
    const measurements = Measure.getMeasurementFromGeometry(feature.getGeometry());
    feature.set("gifw-popup-title", `${annotationType} added at ${timestamp}`);
    

    let popupText = `<h1>Annotation</h1>`;
    switch (annotationType) {
      case "Buffer": {
        popupText += `<p><strong>Buffer:</strong> ${bufferDistance} ${bufferUnit}</p><p>Buffer added at ${timestamp}</p>`
        break;
      }
      case "Point": {
        popupText += `<p><strong>Coordinates:</strong> ${firstCoordinate.toFixed()}, ${secondCoordinate.toFixed()}</p><p>${annotationType} added at ${timestamp}</p>`
        break;
      }
      case "Line": {
        popupText += `<p><strong>Length (Metric): </strong>${measurements.metric} ${measurements.metricUnit}</p>
                         <p><strong>Length (Imperial): </strong>${measurements.imperial} ${measurements.imperialUnit}</p>
                         <p>${annotationType} added at ${timestamp}</p>`
        break;
      }
      case "Polygon": {
        const perimeter = getLength(geometry);
        popupText += `<p><strong>Area (Metric): </strong>${measurements.metric} ${measurements.metricUnit}</p>
                         <p><strong>Area (Imperial): </strong>${measurements.imperial} ${measurements.imperialUnit}</p>
                         <p><strong>Perimeter:</strong> ${perimeter.toFixed()} metres</p><p>${annotationType} added at ${timestamp}</p>`
        break;
      }
      case "Circle": {
        const radius = (geometry as Circle).getRadius();
        popupText += `<p><strong>Centre coordinates:</strong> ${firstCoordinate.toFixed()}, ${secondCoordinate.toFixed()}</p>
                         <p><strong>Radius:</strong> ${radius.toFixed()} metres</p><p>${annotationType} added at ${timestamp}</p>`
        break;
      }
      case "Text": {       
        const text = (feature.getStyle() as Style).getText().getText() || "";
        popupText += `<p><strong>Text:</strong> ${text}</p><p>${annotationType} added at ${timestamp}</p>`;
        break;
      }
      default: {
        popupText += `<p>${annotationType} added at ${timestamp}</p>`
        break;
      }
    }
    return popupText;
  }
}