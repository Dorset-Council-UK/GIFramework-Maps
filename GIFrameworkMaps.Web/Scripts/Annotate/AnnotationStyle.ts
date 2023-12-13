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
    borderColour: string;
    borderColourHex: string;
    pointHasBorder: boolean;
    borderWidth: number;

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
        this.pointHasBorder = false;
        this.borderColour = 'rgb(0, 0, 0)';
        this.borderColourHex = '000000';
        this.borderWidth = 0.5;
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
        clone.pointHasBorder = this.pointHasBorder;
        clone.borderColour = this.borderColour;
        clone.borderColourHex = this.borderColourHex;
        clone.borderWidth = this.borderWidth;
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
            let strokeStyle = '';
            if (this.pointHasBorder) {
                strokeStyle = `stroke:#${this.borderColourHex};stroke-width:${this.borderWidth}`
            }
            let shapes: { [name: string]: string } = {
                'circle': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-circle-fill" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" style="${strokeStyle};" />
                    </svg>
                `,
                'cross': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-x-lg" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="M 2.4365573,13.983865 6.5264837,7.7387676 2.820243,2.0161361 H 5.6448229 L 8.0448995,5.8611567 10.395995,2.0161361 h 2.800089 L 9.4735165,7.8285664 13.563443,13.983865 H 10.649064 L 7.9959183,9.8449572 5.3346089,13.983865 Z"/>
                    </svg>
                `,
                'heart': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-heart-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="M 8,1.7342811 C 12.137662,-2.5189889 22.482748,4.9237674 8,14.494091 -6.4827478,4.9246997 3.8623384,-2.5189889 8,1.7342811 Z"/>
                    </svg>
                `,
                'pin': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-geo-alt-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};stroke-linecap:round" d="m 8,15.401616 c 0,0 5.550208,-5.259748 5.550208,-9.2503484 a 5.5502088,5.5502088 0 0 0 -11.1004168,0 C 2.4497912,10.141868 8,15.401616 8,15.401616 M 8,8.9263721 a 2.7751045,2.7751045 0 1 1 0,-5.550209 2.7751045,2.7751045 0 0 1 0,5.550209"/>
                    </svg>
                `,
                'square': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-square-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="M 0.64252759,2.4818957 A 1.8393681,1.8393681 0 0 1 2.4818957,0.64252759 H 13.518104 A 1.8393681,1.8393681 0 0 1 15.357472,2.4818957 V 13.518104 a 1.8393681,1.8393681 0 0 1 -1.839368,1.839368 H 2.4818957 A 1.8393681,1.8393681 0 0 1 0.64252759,13.518104 Z"/>
                    </svg>
                `,
                'diamond': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-diamond-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="m 7.0286953,1.0020604 c 0.5365237,-0.53652376 1.4060621,-0.53652376 1.9425858,0 l 6.0266409,6.0275665 c 0.536524,0.5365237 0.536524,1.4051371 0,1.9407358 L 8.9712811,14.997929 c -0.5365237,0.536524 -1.405137,0.536524 -1.9407358,0 L 1.0020539,8.9712878 a 1.3709106,1.3709106 0 0 1 0,-1.9407359 z"/>
                    </svg>
                `,
                'star': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-star-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="M 3.8217326,15.087292 C 3.4541767,15.275831 3.0371056,14.945412 3.1113785,14.523579 L 3.9017188,10.019592 0.54705764,6.8239512 C 0.23377819,6.524955 0.39660733,5.9783824 0.81653511,5.9193449 L 5.4804949,5.2566017 7.5601372,1.136358 c 0.1875868,-0.37136473 0.6951186,-0.37136473 0.8827054,0 l 2.0796424,4.1202437 4.66396,0.6627432 c 0.419927,0.059038 0.582757,0.6056101 0.268525,0.9046063 l -3.353709,3.1956408 0.79034,4.503987 c 0.07427,0.421833 -0.342798,0.752252 -0.710354,0.563713 L 8.0000616,12.93909 3.8207803,15.087292 Z"/>
                    </svg>
                `,
                'triangle': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-triangle-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="m 7.0752225,1.9158026 a 1.0685954,1.0685954 0 0 1 1.8534928,0 L 15.413103,12.948813 c 0.432167,0.735723 -0.087,1.670981 -0.926746,1.670981 H 1.5166353 c -0.84069136,0 -1.35891282,-0.936203 -0.92674638,-1.670981 z"/>
                    </svg>
                `,
                'house': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-house-door-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="M 6.5,14.5 V 10.995 C 6.5,10.75 6.75,10.5 7,10.5 h 2 c 0.25,0 0.5,0.25 0.5,0.5 v 3.5 A 0.5,0.5 0 0 0 10,15 h 4 a 0.5,0.5 0 0 0 0.5,-0.5 v -7 A 0.5,0.5 0 0 0 14.354,7.146 L 13,5.793 V 2.5 A 0.5,0.5 0 0 0 12.5,2 h -1 A 0.5,0.5 0 0 0 11,2.5 V 3.793 L 8.354,1.146 a 0.5,0.5 0 0 0 -0.708,0 l -6,6 A 0.5,0.5 0 0 0 1.5,7.5 v 7 A 0.5,0.5 0 0 0 2,15 h 4 a 0.5,0.5 0 0 0 0.5,-0.5"/>
                    </svg>
                `,
                'lightning': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="M 5.7412109,1.0412492 A 0.45535351,0.45535351 0 0 1 6.1783503,0.71430538 H 9.8211784 A 0.45535351,0.45535351 0 0 1 10.252854,1.3135506 L 8.631795,6.1785475 h 3.466151 a 0.45535351,0.45535351 0 0 1 0.359729,0.7349406 L 6.0827261,15.109851 A 0.45535351,0.45535351 0 0 1 5.2876788,14.69639 L 6.9278622,9.3660221 H 3.9015827 A 0.45535351,0.45535351 0 0 1 3.4644434,8.7822589 Z"/>
                    </svg>
                `,
                'person': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-person-arms-up" viewBox="0 0 16 16">
                      <path style="${strokeStyle};" d="m 7.9996559,3.3310448 a 1.4009408,1.4009408 0 1 0 0,-2.80188163 1.4009408,1.4009408 0 0 0 0,2.80188163"/>
                      <path style="${strokeStyle};" d="M 6.0663576,6.7904346 5.276227,14.683335 a 0.71750086,0.71750086 0 0 0 1.4224219,0.189594 L 7.455157,10.329211 a 0.55103671,0.55103671 0 0 1 1.088064,0 l 0.756508,4.543718 a 0.71750091,0.71750091 0 0 0 1.422422,-0.189594 L 9.9329543,6.7904346 A 1.3934691,1.3934691 0 0 1 10.334557,5.6659461 L 12.669459,2.662329 A 0.74343258,0.74343258 0 0 0 11.512282,1.7302364 L 9.5257475,4.1155716 a 0.67245158,0.67245158 0 0 1 -0.308207,0.2194807 c -0.2148109,0.069113 -0.6210838,0.1643771 -1.2178846,0.1643771 -0.5977347,0 -1.0030736,-0.095264 -1.2188184,-0.1643771 A 0.67245158,0.67245158 0 0 1 6.4735644,4.1155716 L 4.4870304,1.7302364 A 0.74343258,0.74343258 0 0 0 3.3289193,2.662329 l 2.3349014,3.0036171 c 0.2960654,0.2951315 0.4436312,0.7079421 0.401603,1.1244885 z"/>
                    </svg>
                `,
                'tree': `
                    <svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" fill="#${this.fillColourHex}" class="bi bi-tree-fill" viewBox="0 0 16 16">
                        <path style="${strokeStyle};" d="m 8.3881954,0.74299626 a 0.46658101,0.46658101 0 0 0 -0.7763908,0 L 4.8123185,4.9422254 a 0.46658101,0.46658101 0 0 0 0.3881954,0.7250669 h 0.09145 L 3.4051102,8.6860714 A 0.46658101,0.46658101 0 0 0 3.8007709,9.3999403 H 3.9790048 L 2.4504855,12.456979 a 0.46658101,0.46658101 0 0 0 0.4171234,0.675609 H 7.066838 v 2.332905 h 1.866324 v -2.332905 h 4.199229 a 0.46658101,0.46658101 0 0 0 0.417124,-0.675609 L 12.021928,9.3999403 h 0.178234 A 0.46658101,0.46658101 0 0 0 12.595823,8.6860714 L 10.708036,5.6672923 h 0.09145 a 0.46658101,0.46658101 0 0 0 0.388195,-0.7250669 z"/>
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
        if (e.detail.style.pointHasBorder != undefined && e.detail.style.pointHasBorder != null) {
            this.pointHasBorder = e.detail.style.pointHasBorder;
        } else {
            this.pointHasBorder;
        }
        let rgbBorderColour = Util.Color.hexToRgb(this.borderColourHex);
        this.borderColour = `rgb(${rgbBorderColour.r}, ${rgbBorderColour.g}, ${rgbBorderColour.b})`;
        this.borderColourHex = e.detail.style.borderColourHex || this.borderColourHex;
        this.borderWidth = e.detail.style.borderWidth || this.borderWidth;
        this.rebuildForTool(this.activeTool);
    }

}