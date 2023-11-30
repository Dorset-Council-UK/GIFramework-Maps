//import Feature from "ol/Feature";
//import Circle from "ol/geom/Circle";
//import Geometry from "ol/geom/Geometry";
//import SimpleGeometry from "ol/geom/SimpleGeometry";
//import { toContext } from "ol/render";
import { Fill, Icon, Stroke, Style, Text } from "ol/style";

import AnnotationStyleEvent from "./AnnotationStyleEvent";
import { AnnotationTool } from "./AnnotationTool";
import { GIFWMap } from "../Map";
import { Util } from "../Util";
//import AnnotationSelect from "./AnnotationSelect";


export default class AnnotationStyle extends Style {

    activeTool: AnnotationTool;
    fillColour: string;
    fillColourHex: string;
    fontColour: string;
    fontColourHex: string;
    fontFamily: string;
    gifwMapInstance: GIFWMap;
    labelText: string;
    opacity: number;
    pointType: string;
    size: number;
    strokeColour: string;
    strokeColourHex: string;
    strokeStyle: 'solid' | 'dashed' | 'dotted';
    strokeWidth: number;

    constructor(gifwMap: GIFWMap) {
        super();
        this.gifwMapInstance = gifwMap;
        this.setDefaults(gifwMap);
        //this.applyCustomRenderer();
    }

    private setDefaults(gifwMap: GIFWMap) {
        this.fillColourHex = gifwMap.config.theme.primaryColour;
        this.fontColourHex = gifwMap.config.theme.primaryColour;
        this.strokeColourHex = gifwMap.config.theme.primaryColour;
        let rgbColor = Util.Color.hexToRgb(this.fillColourHex);
        this.opacity = 0.2;
        this.fillColour = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${this.opacity})`;
        this.fontColour = `rgb(${rgbColor.r},${rgbColor.g},${rgbColor.b})`;
        this.strokeColour = `rgb(${rgbColor.r},${rgbColor.g},${rgbColor.b})`;
        this.labelText = '';
        this.pointType = 'pin';
        this.size = 24;
        this.strokeStyle = 'solid';
        this.strokeWidth = 2;
        this.fontFamily = 'Arial';
        this.setFill(new Fill({
            color: this.fillColour
        }));
        this.setStroke(new Stroke({
            color: this.strokeColour
        }));
        
    }

    /**
    * Sets a custom renderer to the style, so that we may access the canvas context and store metrics against each feature.
    * RQ Note - This was being triggered thousands of times and causing high CPU usage, so has been disabled
    * This only appears to have affected the selection highlighting for points and text (they are now not the right size)
    * For the performance benfit this is an easy win, but we may want to revist this at some point as the functionality
    * was quite useful
    * @returns void
    *
    */
    //private applyCustomRenderer() {
        //console.log('applyCustomRenderer')
        //this.setRenderer((pixelCoordinates, state) => {
        //    const context = state.context;
        //    context.save();
        //    let geometry: SimpleGeometry;
        //    geometry = state.geometry.clone() as SimpleGeometry;
        //    if (geometry.getType() == 'Circle') {
        //        (geometry as Circle).setCenter((pixelCoordinates as number[][])[0]);
        //        (geometry as Circle).setRadius((pixelCoordinates as number[][])[1][0] - (pixelCoordinates as number[][])[0][0]);
        //    } else {
        //        geometry.setCoordinates(pixelCoordinates);
        //    }
        //    const renderContext = toContext(context, {
        //        pixelRatio: 1
        //    });
        //    renderContext.setStyle(this);
        //    if (state.geometry.getType() == 'Circle') {
        //        renderContext.drawCircle(<Circle>geometry);
        //    } else {
        //        renderContext.drawGeometry(geometry);
        //    }
        //    let styleText = this.getText()?.getText();
        //    let styleImageSize = this.getImage()?.getSize();
        //    let longestImageDimension: number;
        //    if (styleImageSize) {
        //        longestImageDimension = 0;
        //        styleImageSize.forEach((dim) => {
        //            if (dim > longestImageDimension) {
        //                longestImageDimension = dim;
        //            }
        //        })
        //    }
        //    let geoFeature = state.feature as Feature<Geometry>;
        //    if (longestImageDimension > 0) {
        //        geoFeature.set('gifw-css-width', longestImageDimension);
        //    } else if (styleText) {
        //        geoFeature.set('gifw-css-width', context.measureText(styleText as string).width);
        //    }
        //    if (!this.gifwMapInstance.olMap.getInteractions().getArray().find((i) => i instanceof AnnotationSelect)) {
        //        console.log('setStyle called');
        //        geoFeature.setStyle(this); // Only set the feature style if the feature isn't already committed and being restyled. AnnotationSelect handles this otherwise, which allows the feature shape to be modified.
        //    }
        //    context.clip();
        //    context.restore();
        //});
    //}

    private clear() {
        this.setFill(new Fill());
        this.setStroke(new Stroke());
        this.getImage()?.setOpacity(0); // Is there a better way to get rid of the image? Perhaps set a blank Icon()?
        this.setText(new Text());
    }

    public getClone() {
        let clone = new AnnotationStyle(this.gifwMapInstance);
        clone.activeTool = this.activeTool;
        clone.fillColour = this.fillColour;
        clone.fillColourHex = this.fillColourHex;
        clone.fontColour = this.fontColour;
        clone.fontColourHex = this.fontColourHex;
        clone.fontFamily = this.fontFamily;
        clone.labelText = this.labelText;
        clone.opacity = this.opacity;
        clone.pointType = this.pointType;
        clone.size = this.size;
        clone.strokeColour = this.strokeColour;
        clone.strokeColourHex = this.strokeColourHex;
        clone.strokeStyle = this.strokeStyle;
        clone.strokeWidth = this.strokeWidth;
        if (this.activeTool) {
            clone.rebuildForTool(this.activeTool);
        }
        return clone;
    }

    public rebuildForTool(tool: AnnotationTool) {
        this.clear();
        this.activeTool = tool;
        if (tool.olDrawType != 'Point' && tool.name != 'Text') {
            let lineDash: number[] | null;
            let lineCap: CanvasLineCap;
            switch (this.strokeStyle) {
                case 'solid':
                    lineDash = null;
                    break;
                case 'dashed':
                    lineDash = [10, 10];
                    break;
                case 'dotted':
                    lineDash = [1, 10];
                    lineCap = 'round';
                    break;
            }
            this.setFill(new Fill({
                color: this.fillColour
            }));
            this.setStroke(new Stroke({
                color: this.strokeColour,
                width: this.strokeWidth,
                lineDash: lineDash,
                lineCap: lineCap
            }));
        } else if (tool.name == 'Point') {
            let shapes: { [name: string]: string } = {
                'circle': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-circle-fill" viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="8"/>
                    </svg>
                `,
                'cross': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-x-lg" viewBox="0 0 16 16">
                        <path d="M 2.4365573,13.983865 6.5264837,7.7387676 2.820243,2.0161361 H 5.6448229 L 8.0448995,5.8611567 10.395995,2.0161361 h 2.800089 L 9.4735165,7.8285664 13.563443,13.983865 H 10.649064 L 7.9959183,9.8449572 5.3346089,13.983865 Z"/>
                    </svg>
                `,
                'heart': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-heart-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                    </svg>
                `,
                'pin': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-geo-alt-fill" viewBox="0 0 16 16">
                        <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
                    </svg>
                `,
                'square': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-square-fill" viewBox="0 0 16 16">
                        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2z"/>
                    </svg>
                `,
                'diamond': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-diamond-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 0 1 0-2.098L6.95.435z"/>
                    </svg>
                `,
                'star': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-star-fill" viewBox="0 0 16 16">
                        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                    </svg>
                `,
                'triangle': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-triangle-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M7.022 1.566a1.13 1.13 0 0 1 1.96 0l6.857 11.667c.457.778-.092 1.767-.98 1.767H1.144c-.889 0-1.437-.99-.98-1.767L7.022 1.566z"/>
                    </svg>
                `,
                'house': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-house-door-fill" viewBox="0 0 16 16">
                        <path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5"/>
                    </svg>
                `,
                'lightning': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641z"/>
                    </svg>
                `,
                'person': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-person-arms-up" viewBox="0 0 16 16">
                        <path d="M8 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                        <path d="m5.93 6.704-.846 8.451a.768.768 0 0 0 1.523.203l.81-4.865a.59.59 0 0 1 1.165 0l.81 4.865a.768.768 0 0 0 1.523-.203l-.845-8.451A1.492 1.492 0 0 1 10.5 5.5L13 2.284a.796.796 0 0 0-1.239-.998L9.634 3.84a.72.72 0 0 1-.33.235c-.23.074-.665.176-1.304.176-.64 0-1.074-.102-1.305-.176a.72.72 0 0 1-.329-.235L4.239 1.286a.796.796 0 0 0-1.24.998l2.5 3.216c.317.316.475.758.43 1.204Z"/>
                    </svg>
                `,
                'tree': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-tree-fill" viewBox="0 0 16 16">
                        <path d="M8.416.223a.5.5 0 0 0-.832 0l-3 4.5A.5.5 0 0 0 5 5.5h.098L3.076 8.735A.5.5 0 0 0 3.5 9.5h.191l-1.638 3.276a.5.5 0 0 0 .447.724H7V16h2v-2.5h4.5a.5.5 0 0 0 .447-.724L12.31 9.5h.191a.5.5 0 0 0 .424-.765L10.902 5.5H11a.5.5 0 0 0 .416-.777l-3-4.5z"/>
                    </svg>
                `,
            }
            this.setImage(new Icon({
                src: `data:image/svg+xml; charset=utf8, ${encodeURIComponent(shapes[this.pointType])}`
            }));
            this.getImage().setOpacity(1);
        } else if (tool.name == 'Text') {
            this.setText(new Text({
                fill: new Fill({
                    color: this.fontColour
                }),
                stroke: new Stroke({
                    color: '#FFFFFF',
                    width: 1
                }),
                text: this.labelText,
                font: `${this.size}px "${this.fontFamily}", sans-serif`,
                scale: window.devicePixelRatio
            }));
        }
        //this.applyCustomRenderer();
    }

    public rebuildFromEvent(e: AnnotationStyleEvent) {
        this.activeTool = e.detail.style.activeTool;
        this.fillColourHex = e.detail.style.fillColourHex || this.fillColourHex;
        this.fontColourHex = e.detail.style.fontColourHex || this.fontColourHex;
        this.fontFamily = e.detail.style.fontFamily || this.fontFamily;
        this.labelText = e.detail.style.labelText || this.labelText;
        if (e.detail.style.opacity != undefined && e.detail.style.opacity != null) {
            this.opacity = e.detail.style.opacity;
        } else {
            this.opacity;
        }
        this.pointType = e.detail.style.pointType || this.pointType;
        this.size = e.detail.style.size || this.size;
        this.strokeColourHex = e.detail.style.strokeColourHex || this.strokeColourHex;
        this.strokeStyle = e.detail.style.strokeStyle || this.strokeStyle;
        this.strokeWidth = e.detail.style.strokeWidth || this.strokeWidth;
        let rgbFillColour = Util.Color.hexToRgb(this.fillColourHex);
        this.fillColour = `rgba(${rgbFillColour.r}, ${rgbFillColour.g}, ${rgbFillColour.b}, ${this.opacity})`;
        let rgbFontColour = Util.Color.hexToRgb(this.fontColourHex);
        this.fontColour = `rgb(${rgbFontColour.r}, ${rgbFontColour.g}, ${rgbFontColour.b})`;
        let rgbStrokeColour = Util.Color.hexToRgb(this.strokeColourHex);
        this.strokeColour = `rgb(${rgbStrokeColour.r}, ${rgbStrokeColour.g}, ${rgbStrokeColour.b})`;
        this.rebuildForTool(this.activeTool);
    }

}