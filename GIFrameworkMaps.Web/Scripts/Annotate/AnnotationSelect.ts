import Collection from "ol/Collection";
import * as Condition from "ol/events/condition";
import Feature, { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import {
  Circle,
  LinearRing,
  MultiPolygon,
  Polygon,
  SimpleGeometry,
} from "ol/geom";
import Geometry from "ol/geom/Geometry";
import * as olPolygon from "ol/geom/Polygon";
import { Modify, Select, Snap } from "ol/interaction";
import { SelectEvent } from "ol/interaction/Select";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Style, Text as TextStyle } from "ol/style";
import Buffer from "@turf/buffer";
import Kinks from "@turf/kinks";
import UnkinkPolygon from "@turf/unkink-polygon";

import AnnotationSource from "./AnnotationSource";
import AnnotationStyle from "./AnnotationStyle";
import { GIFWMap } from "../Map";
import AnnotationStyleEvent from "./AnnotationStyleEvent";
import { Coordinate } from "ol/coordinate";
import CircleStyle from "ol/style/Circle";
import { StyleFunction } from "ol/style/Style";

export default class AnnotationSelect extends Select {
  gifwMapInstance: GIFWMap;
  backdropLayer: VectorLayer;
  modifyInteraction: Modify;
  selectedFeatures: Collection<Feature>; // Required to store features upon forcing dispatch of a select event outside of standard OL handling
  snapInteraction: Snap;
  source: AnnotationSource;
  vertexStyle: Style;

  constructor(gifwMapInstance: GIFWMap, source: AnnotationSource) {
    super({
      condition: (e) => {
        // Select on single click when modifier keys, e.g. shift, are inactive. Disables the selection of multiple features, as this is not supported yet.
        if (Condition.singleClick(e) && Condition.noModifierKeys(e)) {
          /*
           * OL Select interactions rely on getFeaturesAtPixel, but this fails to select features that have zero fill opacity.
           * Instead we force a select event if there are annotations at the click coordinate and dispense with standard OL handling by returning false.
           */
          const featuresAtPixel = this.gifwMapInstance.olMap.getFeaturesAtPixel(
            e.pixel,
            {
              layerFilter: (l) => {
                return l.getSource() == source;
              },
            },
          );
          const featuresAtCoord = source.getFeaturesAtCoordinate(e.coordinate);
          if (featuresAtPixel.length == 0 && featuresAtCoord.length > 0) {
            this.dispatchEvent(
              new SelectEvent(
                "select",
                featuresAtCoord,
                this.selectedFeatures.getArray(),
                e,
              ),
            );
            return false;
          }
          return true;
        }
        return false;
      },
      filter: (feature, layer) => {
        return layer?.getSource() instanceof AnnotationSource;
      },
      multi: false,
      style: null,
    });

    this.gifwMapInstance = gifwMapInstance;
    this.selectedFeatures = new Collection<Feature<Geometry>>();
    this.source = source;
    this.init();
  }

  private init() {
    const backdropSource = new VectorSource();
    this.backdropLayer = new VectorLayer({
      source: backdropSource,
    });
    this.gifwMapInstance.olMap.addLayer(this.backdropLayer);
    this.backdropLayer.setVisible(false);

    this.on("select", (event) => {
      this.handleSelection(event);
    });
    this.gifwMapInstance.olMap.on("moveend", () => {
      if (this.backdropLayer?.getVisible()) {
        this.selectedFeatures.forEach((feature) => {
          this.updateSelectionBackdrop(feature, true);
        });
      }
    });
    this.gifwMapInstance.olMap.addInteraction(this);
    this.setActive(true);
    this.vertexStyle = new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: "red",
        }),
      }),
      text: new TextStyle({
        text: "Double click to delete",
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

  public restyleFeatures(style: AnnotationStyle) {
    this.selectedFeatures.forEach((feature) => {
      feature.setStyle(style);
      this.updateSelectionBackdrop(feature, true);
    });
  }

  public deactivate() {
    this.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(this);
    this.backdropLayer.getSource().clear();
    this.backdropLayer.setVisible(false);
    this.snapInteraction?.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(this.snapInteraction);
    this.modifyInteraction?.setActive(false);
    this.gifwMapInstance.olMap.removeInteraction(this.modifyInteraction);
  }

  private handleSelection(event: SelectEvent) {
    if (this.modifyInteraction?.getActive) {
      this.modifyInteraction.setActive(false);
      this.gifwMapInstance.olMap.removeInteraction(this.modifyInteraction);
      this.snapInteraction?.setActive(false);
      this.gifwMapInstance.olMap.removeInteraction(this.snapInteraction);
    }

    this.selectedFeatures.clear();
    this.selectedFeatures.extend(event.selected);

    if (this.selectedFeatures.getLength() > 0) {
      this.modifyInteraction = new Modify({
        features: this.selectedFeatures,
        deleteCondition: Condition.doubleClick,
      });
      this.gifwMapInstance.olMap.addInteraction(this.modifyInteraction);
      this.modifyInteraction.setActive(true);

      const defaultEditingStyleFunction = this.modifyInteraction
        .getOverlay()
        .getStyleFunction();
      this.modifyInteraction.getOverlay().setStyle((feature: FeatureLike) => {
        return this.renderVertexDeletionTip(
          feature,
          defaultEditingStyleFunction,
        );
      });
      this.snapInteraction = new Snap({
        source: this.source,
      });
      this.gifwMapInstance.olMap.addInteraction(this.snapInteraction);
      this.snapInteraction.setActive(true);
      this.modifyInteraction.addEventListener("modifystart", () => {
        this.backdropLayer.setVisible(false);
      });
      this.modifyInteraction.addEventListener("modifyend", () => {
        this.selectedFeatures.forEach((feature) => {
          this.updateSelectionBackdrop(feature);
        });
        this.backdropLayer.setVisible(true);
      });
      this.selectedFeatures.forEach((feature) => {
        this.updateSelectionBackdrop(feature);
        if (feature.getStyle() instanceof AnnotationStyle) {
          const style = feature.getStyle();
          (style as AnnotationStyle).editMode = "edit";
          document.getElementById(this.gifwMapInstance.id).dispatchEvent(
            new CustomEvent("gifw-annotate-update-panel", {
              detail: {
                    style: style,
              },
            }) as AnnotationStyleEvent,
          );
        }
      });
    } else {
      this.backdropLayer.getSource().clear();
      this.backdropLayer.setVisible(false);
      document
        .getElementById(this.gifwMapInstance.id)
        .dispatchEvent(new CustomEvent("gifw-annotate-update-panel"));
    }
  }

  /**
   * Returns a style that includes the vertex deletion tip if needed
   * @param feature
   */
  private renderVertexDeletionTip(
    feature: FeatureLike,
    defaultEditingStyleFunction: StyleFunction,
  ) {
    const coordinate = (
      feature.getGeometry() as SimpleGeometry
    ).getCoordinates();
    let style = defaultEditingStyleFunction;
    this.gifwMapInstance.olMap.forEachFeatureAtPixel(
      this.gifwMapInstance.olMap.getPixelFromCoordinate(coordinate),
      (feature) => {
        const geometry = feature.getGeometry();
        const geomType = geometry.getType();
        if (geomType === "Polygon" || geomType === "LineString") {
          let coordinates = (geometry as SimpleGeometry).getCoordinates();
          let minCoords = 2;
          if (geomType === "Polygon") {
            coordinates = coordinates[0];
            minCoords = 4;
          }
          coordinates = coordinates.map((coordinate: Coordinate) => {
            return coordinate.toString();
          });
          if (
            coordinates.length > minCoords &&
            coordinates.includes(coordinate.toString())
          ) {
            style = () => {
              return this.vertexStyle;
            };
            return true;
          }
        }
      },
    );
    return style(feature, this.gifwMapInstance.olMap.getView().getResolution());
  }

  /**
   * Reshape the backdrop surrounding the currently selected feature - called when the feature is modified, a feature is selected or the map is moved.
   *
   * @returns void
   * @param feature - the selected feature
   * @param noAnimation - boolean; if true, the backdrop will not fade in. It is anticipated that this will be set to true when the map is moved and there was no need to deactivate the backdrop.
   *
   */
  public updateSelectionBackdrop(
    feature: Feature<Geometry>,
    noAnimation = false,
  ) {
    const bufferSize = 10;
    const mapExtent = this.gifwMapInstance.olMap
      .getView().getViewStateAndExtent().extent;
    const backdropGeometry = olPolygon.fromExtent(mapExtent);
    const resolution = this.gifwMapInstance.olMap.getView().getResolution();
    let featureHalfWidth = 0;

    const clone = feature.clone();
    const featureGeom = clone.getGeometry();
    if (feature.get("gifw-css-width")) {
      featureHalfWidth = feature.get("gifw-css-width") / 2;
    } else if (featureGeom.getType() == "Point") {
      const featureStyle = feature.getStyle() as Style;
      if (featureStyle.getImage() !== null) {
        featureHalfWidth = featureStyle.getImage().getSize()[0] / 2;
      } else if (featureStyle.getText() !== null) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.font = featureStyle.getText().getFont();
        const metrics = context.measureText(
          featureStyle.getText().getText() as string,
        );
        featureHalfWidth = metrics.width / 2 - 10;
        //TODO - An improvement to this would be to draw a rectangle underneath the text at the width/height of the text
      }
    }
    const buffer =
      (resolution / 1000) *
      (bufferSize + featureHalfWidth) *
      window.devicePixelRatio;

    featureGeom.transform("EPSG:3857", "EPSG:4326");
    clone.setGeometry(featureGeom);
    const formatter = new GeoJSON({
      dataProjection: "EPSG:4326",
    });
    const turfFeature = formatter.writeFeatureObject(clone);
    /* eslint-disable @typescript-eslint/no-explicit-any -- Cannot idenitify proper types to use. This code is safe as is, but handle with care */
    let bufferedTurfFeature: any;
    let bufferedGeometry: Polygon;
    let cutout: LinearRing;
    if (featureGeom.getType() == "Circle") {
      featureGeom.transform("EPSG:4326", "EPSG:3857");
      (featureGeom as Circle).setRadius(
        (featureGeom as Circle).getRadius() + buffer * 1000,
      );
      bufferedGeometry = olPolygon.fromCircle(featureGeom as Circle);
      cutout = bufferedGeometry.getLinearRing(0);
    } else {
      let isKinked = false;
      if (featureGeom.getType() != "Point") {
        isKinked = Kinks(turfFeature as any).features.length > 0;
      }
      if (!isKinked) {
        bufferedTurfFeature = Buffer(turfFeature, buffer, {
          units: "kilometers",
        });
        const bufferedFeature = formatter.readFeature(
          bufferedTurfFeature,
        ) as Feature<Polygon>;
        const bufferedGeometry = bufferedFeature.getGeometry();
        bufferedGeometry.transform("EPSG:4326", "EPSG:3857");
        cutout = bufferedGeometry.getLinearRing(0);
      } else {
        let extentPolygon: Polygon;
        if (featureGeom.getType() == "LineString") {
          extentPolygon = olPolygon.fromExtent(featureGeom.getExtent());
        } else {
          try {
            const unkinkedTurfFeatures = UnkinkPolygon(turfFeature as any);
            const unkinkedPolygons = formatter.readFeatures(
              unkinkedTurfFeatures,
            ) as Feature<Polygon>[];
            const geometries: Polygon[] = [];
            unkinkedPolygons.forEach((p) => {
              const geom = p.getGeometry();
              geom.transform("EPSG:4326", "EPSG:3857");
              geometries.push(geom);
            });
            const multiPolygon = new MultiPolygon(geometries);
            extentPolygon = olPolygon.fromExtent(multiPolygon.getExtent());
            extentPolygon.transform("EPSG:3857", "EPSG:4326");
          } catch {
            // Errors may occur if the polygon has multiple vertices at the same coordinate, in which case they cannot and should not be unkinked.
            extentPolygon = olPolygon.fromExtent(featureGeom.getExtent());
          }
        }
        const extentFeature = new Feature(extentPolygon);
        const turfExtent = formatter.writeFeatureObject(extentFeature);
        const bufferedTurfExtent = Buffer(turfExtent, buffer, {
          units: "kilometers",
        });
        const bufferedFeature = formatter.readFeature(
          bufferedTurfExtent,
        ) as Feature<Polygon>;
        bufferedGeometry = bufferedFeature.getGeometry();
        bufferedGeometry.transform("EPSG:4326", "EPSG:3857");
        cutout = bufferedGeometry.getLinearRing(0);
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    backdropGeometry.appendLinearRing(cutout);
    const backdrop = new Feature(backdropGeometry);
    const style = new Style({
      fill: new Fill({
        color: "rgba(0, 0, 0, 0.8)",
      }),
    });
    backdrop.setStyle(style);
    this.backdropLayer.getSource().clear();
    this.backdropLayer.getSource().addFeature(backdrop);
    if (!noAnimation) {
      this.backdropLayer.setOpacity(0.2);
      const fade = setInterval(() => {
        const opacity = this.backdropLayer.getOpacity();
        if (opacity < 0.8) {
          this.backdropLayer.setOpacity(opacity + 0.15);
        } else {
          clearInterval(fade);
        }
      }, 50);
    }
    this.backdropLayer.setVisible(true);
  }
}
