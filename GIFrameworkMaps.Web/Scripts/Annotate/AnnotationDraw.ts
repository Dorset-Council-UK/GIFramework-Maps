import * as Condition from "ol/events/condition";
import Feature from "ol/Feature";
import { Draw } from "ol/interaction";
import { Fill, Style, Text } from "ol/style";
import { GIFWPopupAction } from "../Popups/PopupAction";
import { GIFWPopupOptions } from "../Popups/PopupOptions";
import Geometry, { Type as olGeomType } from "ol/geom/Geometry";
import AnnotationLayer from "./AnnotationLayer";
import AnnotationStyle from "./AnnotationStyle";


export default class AnnotationDraw extends Draw {

    tip: string;

    constructor(type: olGeomType, annotationLayer: AnnotationLayer, annotationStyle: AnnotationStyle) {
        const tip = 'Click to start drawing';
        super({
            source: annotationLayer.getSource(),
            type: type,
            freehand: false,
            freehandCondition: Condition.shiftKeyOnly,
            stopClick: true,
            condition: e => {
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
                if (feature.getGeometry().getType() == 'Point' && annotationStyle.activeTool.name != 'Point' && annotationStyle.activeTool.name != 'Text') { // Add guidance tips to hover around the cursor
                    style = new Style();
                    style.setText(new Text({
                        font: '12px Arial,sans-serif',
                        fill: new Fill({
                            color: 'rgba(255, 255, 255, 1)',
                        }),
                        backgroundFill: new Fill({
                            color: 'rgba(0, 0, 0, 0.4)',
                        }),
                        padding: [2, 2, 2, 2],
                        textAlign: 'left',
                        offsetX: 15,
                        text: this?.tip || tip
                    }));
                } else {
                    style = annotationStyle.getClone();
                }
                return style;
            }
        });
        this.tip = tip;
        
        this.on('drawstart', (e) => {
            if (e.feature.getGeometry().getType() != 'Circle') {
                this.tip = 'Click to draw. Double or right click to finish';
            } else {
                this.tip = 'Click to finish.';
            }
        });

        this.on('drawend', (e) => {
            if (!annotationLayer.getVisible()) {
                annotationLayer.setVisible(true);
            }
            e.feature.setStyle(annotationStyle);
            const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });
            e.feature.set('gifw-popup-title', `${type} added at ${timestamp}`);
            e.feature.set('gifw-geometry-type', type);
            this.addPopupOptionsToFeature(e.feature, annotationLayer, `<h1>Annotation</h1><p>${type} added at ${timestamp}</p>`);
            this.tip = 'Click to start drawing';
            if (annotationStyle.activeTool.name == 'Text' && annotationStyle.labelText.trim().length == 0) { // Do not draw a feature if the 'Add text' tool is active but no text has been specified
                setTimeout(() => {
                    annotationLayer.getSource().removeFeature(e.feature); // Unfortunately, abortDrawing() does not work properly when called by listeners of the drawstart event and a timeout is needed here to allow other events to complete, otherwise removal of the feature errors!
                }, 500);
            }
        });

        this.on('drawabort', () => {
            this.tip = 'Click to start drawing';
        })
    }

    private addPopupOptionsToFeature(feature: Feature<Geometry>, annotationLayer: AnnotationLayer, popupContent: string) {
        const removeAction = new GIFWPopupAction("Remove drawing", () => {
            annotationLayer.getSource().removeFeature(feature);
            if (annotationLayer.getSource().getFeatures().length === 0) {
                annotationLayer.setVisible(false);
            }
        }, true, true);
        const removeAllAction = new GIFWPopupAction("Remove all drawings", () => {
            annotationLayer.getSource().clear();
            annotationLayer.setVisible(false);
        }, true, true);
        const popupOpts = new GIFWPopupOptions(popupContent, [removeAction, removeAllAction]);
        feature.set('gifw-popup-opts', popupOpts)
    }

}
