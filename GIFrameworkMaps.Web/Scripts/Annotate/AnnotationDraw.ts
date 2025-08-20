import Buffer from "@turf/buffer";
import { point as turfPoint } from "@turf/helpers";
import * as Condition from "ol/events/condition";
import Feature from "ol/Feature";
import { Draw } from "ol/interaction";
import { Fill, Style, Text } from "ol/style";
import { Type as olGeomType } from "ol/geom/Geometry";
import AnnotationStyle from "./AnnotationStyle";
import { Point, Polygon } from "ol/geom";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import Annotate from "./Annotate";

export default class AnnotationDraw extends Draw {
  tip: string;

  constructor(
    type: olGeomType,
    annotationLayer: VectorLayer,
    annotationStyle: AnnotationStyle,
  ) {
    const tip = (annotationStyle.activeTool.name === "Buffer" 
        ? "Click to draw a buffer"
        : "Click to start drawing"
    );
    super({
      source: annotationLayer.getSource(),
      type: type,
      freehand: false,
      freehandCondition: Condition.shiftKeyOnly,
      stopClick: true,
      condition: (e) => {
        // this handles right click to finish functionality
        if ((e.originalEvent as PointerEvent).buttons === 1) {
          return true;
        } else if ((e.originalEvent as PointerEvent).buttons === 2) {
          //when we right click to finish we have to manually append the new coordinates to the drawing
          this.appendCoordinates([e.coordinate]);
          this.finishDrawing();
          return false;
        } else {
          return false;
        }
      },
      style: (feature) => {
        let style;
        if (
          feature.getGeometry().getType() == "Point" &&
          annotationStyle.activeTool.name != "Point" &&
          annotationStyle.activeTool.name != "Text"
        ) {
          // Add guidance tips to hover around the cursor
          style = new Style();
          style.setText(
            new Text({
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
              text: this?.tip || tip,
            }),
          );
        } else {
          style = annotationStyle.getClone();
        }
        return style;
      },
    });
    this.tip = tip;

    this.on("drawstart", (e) => {
      if (e.feature.getGeometry().getType() != "Circle") {
        this.tip = "Click to draw. Double or right click to finish";
      } else {
        this.tip = "Click to finish.";
      }
    });

    this.on("drawend", (e) => {
      if (!annotationLayer.getVisible()) {
        annotationLayer.setVisible(true);
      }
      let feature = e.feature;

      const bufferDistance = annotationStyle.radiusNumber;
      const bufferUnit = annotationStyle.radiusUnit;
      if (annotationStyle.activeTool.name === "Buffer") {
        //create the buffer feature

        const formatter = new GeoJSON({
          dataProjection: "EPSG:4326",
        });
        const featureGeom = e.feature.getGeometry();
        featureGeom.transform(
          this.getMap().getView().getProjection(),
          "EPSG:4326",
        );

        const point = turfPoint((featureGeom as Point).getCoordinates());
        const buffer = Buffer(point, bufferDistance, { units: bufferUnit });

        const bufferedFeature = formatter.readFeature(
          buffer,
        ) as Feature<Polygon>;
        const bufferedGeometry = bufferedFeature.getGeometry();
        bufferedGeometry.transform(
          "EPSG:4326",
          this.getMap().getView().getProjection(),
        );
        feature = new Feature(bufferedGeometry);
        annotationLayer.getSource().addFeature(feature);
      }

      feature.setStyle(annotationStyle);
      feature.set('gifw-annotations-buffer-radius-unit', annotationStyle.radiusUnit);
      feature.set('gifw-annotations-buffer-radius-number', annotationStyle.radiusNumber);
      feature.set('gifw-annotations-drawing-type', annotationStyle.activeTool.name);
      feature.set("gifw-geometry-type", type);

      const popupText = Annotate.getPopupTextForFeature(annotationStyle.activeTool.name, feature);
      Annotate.addPopupOptionsToFeature(
        feature,
        annotationLayer,
        popupText,
      );
        if (annotationStyle.activeTool.name === "Buffer") {
            this.tip = "Click to draw a buffer";
        } else {
            this.tip = "Click to start drawing";
        }
      if (
        annotationStyle.activeTool.name == "Text" &&
        annotationStyle.labelText.trim().length == 0
      ) {
        // Do not draw a feature if the 'Add text' tool is active but no text has been specified
        setTimeout(() => {
          annotationLayer.getSource().removeFeature(feature); // Unfortunately, abortDrawing() does not work properly when called by listeners of the drawstart event and a timeout is needed here to allow other events to complete, otherwise removal of the feature errors!
        }, 500);
      }
    });

    this.on("drawabort", () => {
      this.tip = "Click to start drawing";
    });
  }
}
