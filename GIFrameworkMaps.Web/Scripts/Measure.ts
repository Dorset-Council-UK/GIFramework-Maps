import { GIFWMap } from "./Map";
import { Draw, Modify, Snap } from "ol/interaction";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
  Text,
} from "ol/style";
import Geometry, { Type as olGeomType } from "ol/geom/Geometry";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import { getArea, getLength } from "ol/sphere";
import VectorLayer from "ol/layer/Vector";
import { never as olConditionNever } from "ol/events/condition";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import { DrawEvent } from "ol/interaction/Draw";
import { GIFWPopupAction } from "./Popups/PopupAction";
import { GIFWPopupOptions } from "./Popups/PopupOptions";
import { MeasurementResult } from "./Interfaces/MeasurementResult";
import { Control as olControl } from "ol/control";
import { Alert, AlertType, AlertSeverity, hexToRgb } from "./Util";
import { FeatureLike } from "ol/Feature";
import { Coordinate } from "ol/coordinate";
import { Polygon } from "ol/geom";
import { Modal } from "bootstrap";
import { getItem as getSetting, setItem as setSetting } from "./UserSettings";

type UnitType = "metric" | "imperial";
export class Measure extends olControl {
  gifwMapInstance: GIFWMap;
  preferredUnits: UnitType;
  showSegmentLengths: boolean;
  showTotals: boolean;
  _modifyControl: Modify;
  _drawControl: Draw;
  _snapControl: Snap;
  _modifyStyle: Style;
  _basicStyle: Style;
  _labelStyle: Style;
  _tipStyle: Style;
  _segmentStyles: Style[];
  _tipPoint: Geometry;
  _measureLayer: VectorLayer;
  _vectorSource: VectorSource;
  _areaMeasurementControlElement: HTMLElement;
  _lineMeasurementControlElement: HTMLElement;
  _measureToggleControlElement: HTMLElement;
  _clearMeasurementControlElement: HTMLElement;
  _measureConfiguratorControlElement: HTMLElement;
  _keyboardEventAbortController: AbortController;
  constructor(gifwMapInstance: GIFWMap) {
    const measureControlElement = document.createElement("div");

    super({
      element: measureControlElement,
    });

    this.gifwMapInstance = gifwMapInstance;
    this.getMeasurementPreferences();
    this.renderMeasureControls();
    this.addUIEvents();
  }

  public init() {
    this._modifyStyle = this.getModifyStyle();
    this._basicStyle = this.getBasicStyle();
    this._labelStyle = this.getLabelStyle();
    this._tipStyle = this.getTipStyle();
    this._segmentStyles = [this.getSegmentStyle()];

    this.createAndAddMeasureLayer();
    this.addModifyControl();
    this.addMeasureEvents();
  }

  private createAndAddMeasureLayer(): void {
    this._vectorSource = new VectorSource();

    this._measureLayer = this.gifwMapInstance.addNativeLayerToMap(
      this._vectorSource,
      "Measurements",
      (feature: Feature<Geometry>) => {
        return this.getStyleForMeasureFeature(feature, true);
      },
      false,
      LayerGroupType.SystemNative,
      undefined,
      undefined,
      "__measurements__",
      { declutter: true },
    );
    this._measureLayer.on("change", () => {
      if (this._measureLayer.getSource().getFeatures().length === 0) {
        this._clearMeasurementControlElement
          .querySelector("button")
          .setAttribute("disabled", "");
      } else {
        this._clearMeasurementControlElement
          .querySelector("button")
          .removeAttribute("disabled");
      }
    });
  }

  private addModifyControl() {
    this._modifyControl = new Modify({
      source: this._measureLayer.getSource(),
      style: this._modifyStyle,
    });
    this._modifyControl.on("modifyend", (e) => {
      //loop through modified features and update popup text
      e.features.forEach((f) => {
        this.addMeasurementInfoToPopup(f as Feature<Geometry>);
      });
    });
  }

  private addMeasureEvents() {
    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-line-measure-start", () => {
        this.gifwMapInstance.deactivateInteractions();
        this.gifwMapInstance.hidePopup();
        //add ol-control-active class
        this._lineMeasurementControlElement.classList.add("ol-control-active");
        this.activateMeasure("LineString");
      });

    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-area-measure-start", () => {
        this.gifwMapInstance.deactivateInteractions();
        this.gifwMapInstance.hidePopup();
        //add ol-control-active class
        this._areaMeasurementControlElement.classList.add("ol-control-active");
        this.activateMeasure("Polygon");
      });

    document
      .getElementById(this.gifwMapInstance.id)
      .addEventListener("gifw-measure-deactivate", () => {
        this.deactivateMeasure();
      });
  }

  private renderMeasureControls() {
    const genericClasses = "gifw-measure-control ol-unselectable ol-control";
    const rulerButton = document.createElement("button");
    rulerButton.innerHTML = '<i class="bi bi-rulers"></i>';
    rulerButton.setAttribute("title", "Open measure controls");
    const rulerElement = document.createElement("div");
    rulerElement.className = genericClasses;
    rulerElement.appendChild(rulerButton);

    const lineMeasureButton = document.createElement("button");
    lineMeasureButton.innerHTML =
      '<svg width="20" height="20" fill="currentColor" class="bi bi-ruler-line" viewBox="0 0 16 16"><path d="M3.11.6 16 11.909l-3.11 3.545L0 4.145ZM1.384 4.055l11.416 10.016L14.617 12l-.332-.298-.298.34-.362-.324.292-.333-.672-.589-.747.852-.369-.323.748-.852-.672-.589-.291.332-.368-.316.298-.34-.672-.589-.753.86-.369-.324.754-.859-.671-.589-.298.34-.362-.324.292-.332-.672-.59-.747.853-.369-.324.748-.852-.672-.589-.291.332-.368-.316.298-.34-.672-.589-.753.86-.369-.323.754-.86-.671-.589-.298.34-.362-.324.292-.332-.672-.59-.747.853-.369-.323.748-.853-.672-.589-.291.332-.368-.316.298-.34-.339-.29Z" aria-label="Line measurement icon"/></svg>';
    lineMeasureButton.setAttribute("title", "Measure a line");
    const lineMeasureElement = document.createElement("div");
    lineMeasureElement.className = `gifw-line-measure-control ${genericClasses} ol-hidden`;
    lineMeasureElement.appendChild(lineMeasureButton);

    const areaMeasureButton = document.createElement("button");
    areaMeasureButton.innerHTML =
      '<svg width="20" height="20" fill="currentColor" class="bi bi-ruler-area" viewBox="0 0 16 16"><path d="M1.07 0q.216 0 .4.088.194.081.342.229l13.875 13.825q.312.31.313.741 0 .222-.088.416-.08.193-.228.341-.14.149-.333.231-.192.09-.414.09L.039 16 0 1.078Q0 .856.08.663.17.463.31.32.457.172.649.09.849 0 1.071 0zm.032 14.93 13.832-.037-1.41-1.405-.34.35-.379-.378.34-.35-.69-.687-.872.884-.379-.377.88-.877-.691-.688-.347.342-.38-.377.348-.342-.69-.688-.872.877-.378-.377.871-.878-.69-.688-.34.35-.379-.377.34-.35-.69-.688-.872.885-.378-.377.878-.878-.69-.688-.347.342-.379-.377.347-.342-.69-.688-.871.878-.38-.378.872-.877-.69-.688-.34.35-.378-.378.34-.35-.691-.687-.871.885-.38-.378.88-.877-.69-.688-.348.342-.378-.377.347-.342-1.41-1.406Zm2.12-2.135-.017-6.4 6.407 6.384z" aria-label="Area measurement icon"></path></svg>';
    areaMeasureButton.setAttribute("title", "Measure an area");
    const areaMeasureElement = document.createElement("div");
    areaMeasureElement.className = `gifw-area-measure-control ${genericClasses} ol-hidden`;
    areaMeasureElement.appendChild(areaMeasureButton);

    const clearMeasuresButton = document.createElement("button");
    clearMeasuresButton.innerHTML = '<i class="bi bi-trash"></i>';
    clearMeasuresButton.setAttribute("title", "Delete all measurements");
    clearMeasuresButton.setAttribute("disabled", "");
    const clearMeasuresElement = document.createElement("div");
    clearMeasuresElement.className = `gifw-clear-measure-control ${genericClasses} ol-hidden`;
    clearMeasuresElement.appendChild(clearMeasuresButton);

    const measureConfiguratorButton = document.createElement("button");
    measureConfiguratorButton.innerHTML = '<i class="bi bi-gear-fill"></i>';
    measureConfiguratorButton.setAttribute("title", "Configure measurements");
    const measureConfiguratorElement = document.createElement("div");
    measureConfiguratorElement.className = `gifw-configure-measure-control ${genericClasses} ol-hidden`;
    measureConfiguratorElement.appendChild(measureConfiguratorButton);

    this.element.appendChild(rulerElement);
    this.element.appendChild(areaMeasureElement);
    this.element.appendChild(lineMeasureElement);
    this.element.appendChild(clearMeasuresElement);
    this.element.appendChild(measureConfiguratorElement);
    this._areaMeasurementControlElement = areaMeasureElement;
    this._lineMeasurementControlElement = lineMeasureElement;
    this._clearMeasurementControlElement = clearMeasuresElement;
    this._measureConfiguratorControlElement = measureConfiguratorElement;
    this._measureToggleControlElement = rulerElement;
  }

  private addUIEvents() {
    const rulerButton =
      this._measureToggleControlElement.querySelector("button");
    const areaMeasureButton =
      this._areaMeasurementControlElement.querySelector("button");
    const lineMeasureButton =
      this._lineMeasurementControlElement.querySelector("button");
    const clearMeasureButton =
      this._clearMeasurementControlElement.querySelector("button");
    const measureConfiguratorButton =
      this._measureConfiguratorControlElement.querySelector("button");

    rulerButton.addEventListener("click", () => {
      //toggle visibility of sub controls
      if (this._lineMeasurementControlElement.classList.contains("ol-hidden")) {
        //show controls
        this._lineMeasurementControlElement.classList.remove("ol-hidden");
        this._areaMeasurementControlElement.classList.remove("ol-hidden");
        this._clearMeasurementControlElement.classList.remove("ol-hidden");
        this._measureConfiguratorControlElement.classList.remove("ol-hidden");
        rulerButton.innerHTML = `<i class="bi bi-chevron-double-left"></i>`;
        rulerButton.setAttribute("title", "Collapse measure controls");
      } else {
        this.gifwMapInstance.resetInteractionsToDefault();
        this._lineMeasurementControlElement.classList.add("ol-hidden");
        this._lineMeasurementControlElement.classList.remove(
          "ol-control-active",
        );
        this._areaMeasurementControlElement.classList.add("ol-hidden");
        this._areaMeasurementControlElement.classList.remove(
          "ol-control-active",
        );
        this._clearMeasurementControlElement.classList.add("ol-hidden");
        this._measureConfiguratorControlElement.classList.add("ol-hidden");
        rulerButton.innerHTML = `<i class="bi bi-rulers"></i>`;
        rulerButton.setAttribute("title", "Open measure controls");
      }
      rulerButton.blur();
    });

    areaMeasureButton.addEventListener("click", () => {
      if (
        this._areaMeasurementControlElement.classList.contains(
          "ol-control-active",
        )
      ) {
        //deactivate
        this.gifwMapInstance.resetInteractionsToDefault();
        areaMeasureButton.blur();
      } else {
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-area-measure-start"));
      }
    });

    lineMeasureButton.addEventListener("click", () => {
      if (
        this._lineMeasurementControlElement.classList.contains(
          "ol-control-active",
        )
      ) {
        //deactivate
        this.gifwMapInstance.resetInteractionsToDefault();
        lineMeasureButton.blur();
      } else {
        document
          .getElementById(this.gifwMapInstance.id)
          .dispatchEvent(new Event("gifw-line-measure-start"));
      }
    });

    clearMeasureButton.addEventListener("click", () => {
      this.gifwMapInstance.resetInteractionsToDefault();
      clearMeasureButton.blur();
      if (
        (this._measureLayer.getSource() as VectorSource<Feature>).getFeatures()
          .length === 0
      ) {
        alert("You don't have any measurements to clear!");
      } else {
        if (confirm("Are you sure you want to delete all your measurements?")) {
          this._measureLayer.getSource().clear();
          this._measureLayer.setVisible(false);
        }
      }
    });

    measureConfiguratorButton.addEventListener("click", (e) => {
      const measureConfiguratorModal = new Modal(
        document.getElementById("measurement-configurator-modal"),
        {},
      );
      (
        document.getElementById(
          "measureConfigPreferredUnits",
        ) as HTMLSelectElement
      ).value = this.preferredUnits;
      (
        document.getElementById(
          "measureConfigShowSegmentLengths",
        ) as HTMLInputElement
      ).checked = this.showSegmentLengths;
      (
        document.getElementById(
          "measureConfigShowTotalLength",
        ) as HTMLInputElement
      ).checked = this.showTotals;
      measureConfiguratorModal.show();
      e.preventDefault();
    });

    document
      .getElementById("measureConfigForm")
      .addEventListener("submit", (e) => {
        const newUnits = (
          document.getElementById(
            "measureConfigPreferredUnits",
          ) as HTMLSelectElement
        ).value;
        const showSegments = (
          document.getElementById(
            "measureConfigShowSegmentLengths",
          ) as HTMLInputElement
        ).checked;
        const showTotals = (
          document.getElementById(
            "measureConfigShowTotalLength",
          ) as HTMLInputElement
        ).checked;
        this.setMeasurementPreferences(
          newUnits as UnitType,
          showSegments,
          showTotals,
        );
        const measureConfiguratorModal = Modal.getInstance(
          document.getElementById("measurement-configurator-modal"),
        );
        measureConfiguratorModal.hide();
        e.preventDefault();
      });
  }

  private getMeasurementPreferences() {
    const measureShowSegmentsUserPref = getSetting(
      "measureShowSegments",
      undefined,
      ["true", "false"],
    );
    const measureShowTotalsUserPref = getSetting(
      "measureShowTotals",
      undefined,
      ["true", "false"],
    );
    this.showSegmentLengths =
      measureShowSegmentsUserPref === null
        ? true
        : measureShowSegmentsUserPref === "true";
    this.showTotals =
      measureShowTotalsUserPref === null
        ? true
        : measureShowTotalsUserPref === "true";
    this.preferredUnits =
      (getSetting("measurePreferredUnits", undefined, [
        "metric",
        "imperial",
      ]) as UnitType) || "metric";
  }

  private setMeasurementPreferences(
    newUnits: UnitType,
    showSegments: boolean,
    showTotals: boolean,
  ) {
    this.preferredUnits = newUnits;
    this.showSegmentLengths = showSegments;
    this.showTotals = showTotals;
    setSetting("measurePreferredUnits", newUnits);
    setSetting(
      "measureShowSegments",
      showSegments === true ? "true" : "false",
    );
    setSetting(
      "measureShowTotals",
      showTotals === true ? "true" : "false",
    );
    //reset the labels and feature popup contents of any existing measurements
    const source = this._measureLayer.getSource();
    if (source.getFeatures().length !== 0) {
      source.changed();
      source.getFeatures().forEach((feat) => {
        this.addMeasurementInfoToPopup(feat);
      });
    }
  }

  private activateMeasure(drawType: olGeomType) {
    //switch layer if it isn't on already
    if (!this._measureLayer.getVisible()) {
      this._measureLayer.setVisible(true);
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
    this.gifwMapInstance.olMap.getTargetElement().style.cursor = "crosshair";
    const activeTip = "Click to draw. Double or right click to finish";
    const idleTip = "Click to start measuring";
    let tip = idleTip;
    this._drawControl = new Draw({
      source: this._vectorSource,
      type: drawType,
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
        return this.getStyleForMeasureFeature(feature, true, drawType, tip);
      },
    });
    this._snapControl = new Snap({
      source: this._vectorSource,
    });
    this._drawControl.on("drawstart", () => {
      if (!this._measureLayer.getVisible()) {
        this._measureLayer.setVisible(true);
      }
      this._modifyControl.setActive(false);
      tip = activeTip;
    });
    this._drawControl.on("drawend", (e: DrawEvent) => {
      tip = idleTip;
      this.finishMeasurement(e);
    });

    this._drawControl.on("drawabort", () => {
      tip = idleTip;
    });

    this.gifwMapInstance.olMap.addInteraction(this._modifyControl);
    this._modifyControl.setActive(true);
    this.gifwMapInstance.olMap.addInteraction(this._drawControl);
    this.gifwMapInstance.olMap.addInteraction(this._snapControl);

    this.gifwMapInstance.disableContextMenu();
  }
  private finishMeasurement(e: DrawEvent) {
    if (!this._measureLayer.getVisible()) {
      this._measureLayer.setVisible(true);
    }
    this._modifyStyle.setGeometry(this._tipPoint);
    this._modifyControl.setActive(true);
    this.gifwMapInstance.olMap.once("pointermove", () => {
      this._modifyStyle.setGeometry(null); /*IS THIS RIGHT????*/
    });

    this.addMeasurementInfoToPopup(e.feature as Feature<Geometry>);
    if (!this.showTotals) {
      const measurements = this.getMeasurementFromGeometry(
        e.feature.getGeometry(),
      );

      const modalContent = `<p class="mb-0">Metric: ${measurements.metric} ${measurements.metricUnit}</p>
                          <p class="mb-0">Imperial: ${measurements.imperial} ${measurements.imperialUnit}</p>
                          <div class="alert alert-info small p-2""><span class="bi bi-info-circle"></span> You can get this information anytime by clicking the ${measurements.name} measurement you drew</div>`;
      const totalMeasurementsModal = new Alert(
        AlertType.Popup,
        AlertSeverity.Info,
        `${measurements.name} measurement results`,
        modalContent,
        "#gifw-error-modal",
      );
      totalMeasurementsModal.show();
    }
  }

  private deactivateMeasure(): void {
    this._keyboardEventAbortController?.abort();
    this.gifwMapInstance.olMap.getTargetElement().style.cursor = "";
    this._lineMeasurementControlElement.classList.remove("ol-control-active");
    this._areaMeasurementControlElement.classList.remove("ol-control-active");
    this._modifyControl?.setActive(false);
    this._drawControl?.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(this._drawControl);
    this.gifwMapInstance.olMap.removeInteraction(this._snapControl);
    this.gifwMapInstance.enableContextMenu();
  }

  private addMeasurementInfoToPopup(feature: Feature<Geometry>) {
    const measurements = this.getMeasurementFromGeometry(feature.getGeometry());

    const popupContent = `<h1>${measurements.name} Measurement</h1>
                            <h2>Metric</h2>
                            <p>${measurements.metric} ${measurements.metricUnit}</p>
                            <h2>Imperial</h2>
                            <p>${measurements.imperial} ${measurements.imperialUnit}</p>`;

    const removeAction = new GIFWPopupAction("Remove measurement", () => {
      (this._measureLayer.getSource() as VectorSource<Feature>).removeFeature(
        feature,
      );
      if (
        (this._measureLayer.getSource() as VectorSource<Feature>).getFeatures()
          .length === 0
      ) {
        this._measureLayer.setVisible(false);
      }
    });
    const removeAllAction = new GIFWPopupAction(
      "Remove all measurements",
      () => {
        (this._measureLayer.getSource() as VectorSource<Feature>).clear();
        this._measureLayer.setVisible(false);
      },
    );
    const popupOpts = new GIFWPopupOptions(popupContent, [
      removeAction,
      removeAllAction,
    ]);
    feature.set("gifw-popup-opts", popupOpts);
    let measurementText = `${measurements.metric} ${measurements.metricUnit}`;
    if (this.preferredUnits === "imperial") {
      measurementText = `${measurements.imperial} ${measurements.imperialUnit}`;
    }
    feature.set(
      "gifw-popup-title",
      `${measurementText} ${measurements.name} Measurement`,
    );
  }

  private getMeasurementFromGeometry(geom: Geometry): MeasurementResult {
    const type = geom.getType();
    let metric, imperial, metricOutput, imperialOutput: number;
    let metricUnit, imperialUnit, measurementName: string;
    if (type === "LineString") {
      metric = getLength(geom); //metres
      metricUnit = "m";

      imperial = metric * 1.0936132983; //yards
      imperialUnit = "yards";
      metricOutput = metric;
      imperialOutput = imperial;

      if (metric >= 1000) {
        metricOutput = Math.round((metric / 1000) * 100) / 100;
        metricUnit = "km";
      } else {
        metricOutput = Math.round(metric * 100) / 100;
      }
      if (imperial > 880) {
        imperialOutput = Math.round(metric * 0.000621371192 * 1000) / 1000;
        imperialUnit = "mi";
      } else {
        imperialOutput = Math.round(imperial * 100) / 100;
      }
      measurementName = "Length";
    } else if (type === "Polygon") {
      metric = getArea(geom); //square metres
      metricUnit = "m\xB2";

      imperial = metric * 1.196; //square yards
      imperialUnit = "yards\xB2";
      metricOutput = metric;
      imperialOutput = imperial;

      if (metric > 100000) {
        metricOutput = Math.round((metric / 1000000) * 100) / 100;
        metricUnit = "km\xB2";
      } else if (metric > 10000) {
        metricOutput = Math.round((metric / 10000) * 100) / 100;
        metricUnit = "Hectares";
      } else {
        metricOutput = Math.round(metric * 100) / 100;
      }
      if (imperial < 4840) {
        imperialOutput = Math.round(imperial * 100) / 100;
      } else {
        imperialOutput = Math.round(metric * 0.000247105381 * 1000) / 1000;
        imperialUnit = "Acres";
      }
      measurementName = "Area";
    }

    const areaResult: MeasurementResult = {
      metric: metricOutput,
      imperial: imperialOutput,
      name: measurementName,
      metricUnit: metricUnit,
      imperialUnit: imperialUnit,
    };
    return areaResult;
  }

  private getStyleForMeasureFeature(
    feature: FeatureLike,
    segments: boolean,
    drawType?: olGeomType,
    tip?: string,
  ) {
    const styles = [this._basicStyle];
    const geometry = feature.getGeometry();
    const type = geometry.getType();
    let point, label, line;
    if (!drawType || drawType === type) {
      const measurements = this.getMeasurementFromGeometry(
        geometry as Geometry,
      );
      if (type === "Polygon") {
        point = (geometry as Polygon).getInteriorPoint();
        line = new LineString((geometry as Polygon).getCoordinates()[0]);
      } else if (type === "LineString") {
        point = new Point((geometry as Polygon).getLastCoordinate());
        line = geometry;
      }
      label = `${measurements.metric} ${measurements.metricUnit}`;
      if (this.preferredUnits === "imperial") {
        label = `${measurements.imperial} ${measurements.imperialUnit}`;
      }
    }
    if (segments && line && type === "LineString" && this.showSegmentLengths) {
      let count = 0;
      (line as LineString).forEachSegment((a: Coordinate, b: Coordinate) => {
        const segment = new LineString([a, b]);
        const measurements = this.getMeasurementFromGeometry(segment);
        let label = `${measurements.metric} ${measurements.metricUnit}`;
        if (this.preferredUnits === "imperial") {
          label = `${measurements.imperial} ${measurements.imperialUnit}`;
        }
        if (this._segmentStyles.length - 1 < count) {
          this._segmentStyles.push(this.getSegmentStyle());
        }
        const segmentPoint = new Point(segment.getCoordinateAt(0.5));
        this._segmentStyles[count].setGeometry(segmentPoint);
        this._segmentStyles[count].getText().setText(label);
        styles.push(this._segmentStyles[count]);
        count++;
      });
    }
    if (label && this.showTotals) {
      this._labelStyle.setGeometry(point);
      this._labelStyle.getText().setText(label);
      styles.push(this._labelStyle);
    }
    if (
      tip &&
      type === "Point" &&
      !this._modifyControl.getOverlay().getSource().getFeatures().length
    ) {
      this._tipPoint = geometry as Geometry;
      this._tipStyle.getText().setText(tip);
      styles.push(this._tipStyle);
    }
    return styles;
  }

  private getModifyStyle(): Style {
    return new Style({
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.7)",
        }),
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.4)",
        }),
      }),
      text: new Text({
        text: "Drag to modify",
        font: "12px Arial,sans-serif",
        fill: new Fill({
          color: "rgba(255, 255, 255, 1)",
        }),
        backgroundFill: new Fill({
          color: "rgba(0, 0, 0, 0.7)",
        }),
        padding: [2, 2, 2, 2],
        textAlign: "left",
        offsetX: 15,
      }),
    });
  }

  private getBasicStyle(): Style {
    const rgbColor = hexToRgb(
      this.gifwMapInstance.config.theme.primaryColour,
    );
    return new Style({
      fill: new Fill({
        color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`,
      }),
      stroke: new Stroke({
        color: `rgb(${rgbColor.r},${rgbColor.g},${rgbColor.b})`,
        width: 2,
      }),
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.7)",
        }),
        fill: new Fill({
          color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`,
        }),
      }),
      zIndex: -2,
    });
  }

  private getSegmentStyle(): Style {
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
        textBaseline: "bottom",
        offsetY: -12,
      }),
      image: new RegularShape({
        radius: 6,
        points: 3,
        angle: Math.PI,
        displacement: [0, 7],
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.4)",
        }),
      }),
      zIndex: -1, //this forces the segments to declutter away BEFORE the total length
    });
  }

  private getLabelStyle(): Style {
    return new Style({
      text: new Text({
        font: "14px Arial,sans-serif",
        fill: new Fill({
          color: "rgba(255, 255, 255, 1)",
        }),
        backgroundFill: new Fill({
          color: "rgba(0, 0, 0, 0.7)",
        }),
        padding: [3, 3, 3, 3],
        textBaseline: "bottom",
        offsetY: -15,
      }),
      image: new RegularShape({
        radius: 8,
        points: 3,
        angle: Math.PI,
        displacement: [0, 8],
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.7)",
        }),
      }),
      zIndex: 0,
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
