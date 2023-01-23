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
                        <path fill-rule="evenodd" d="M13.854 2.146a.5.5 0 0 1 0 .708l-11 11a.5.5 0 0 1-.708-.708l11-11a.5.5 0 0 1 .708 0Z"/>
                        <path fill-rule="evenodd" d="M2.146 2.146a.5.5 0 0 0 0 .708l11 11a.5.5 0 0 0 .708-.708l-11-11a.5.5 0 0 0-.708 0Z"/>
                    </svg>
                `,
                'heart': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-heart-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                    </svg>
                `,
                'pin': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-pin-fill" viewBox="0 0 16 16">
                        <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/>
                    </svg>
                `,
                'square': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-square-fill" viewBox="0 0 16 16">
                        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2z"/>
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
                `
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