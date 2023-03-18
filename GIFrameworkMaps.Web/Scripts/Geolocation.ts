import { GIFWMap } from "./Map";
import { Control as olControl } from "ol/control";
import Geolocation from "ol/Geolocation";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import VectorLayer from "ol/layer/Vector";
import { Fill, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { Util } from "./Util";
import { Polygon, Point, LineString} from "ol/geom";

export class GIFWGeolocation extends olControl {
    gifwMapInstance: GIFWMap;
    _geolocation: Geolocation;
    _trackControlElement: HTMLElement;
    _vectorSource: VectorSource;
    _locationLayer: VectorLayer<any>;
    _accuracyFeature: Feature<Polygon>;
    _locationFeature: Feature<Point>;
    _pathFeature: Feature<LineString>;
    constructor(gifwMapInstance: GIFWMap) {

        let geolocationControlElement = document.createElement('div');

        super({
            element: geolocationControlElement
        })

        this.gifwMapInstance = gifwMapInstance;
        this.renderGeolocationControls();
        this.addUIEvents();
    }

    public init() {
        this._vectorSource = new VectorSource();

        this._locationLayer = this.gifwMapInstance.addNativeLayerToMap(this._vectorSource, "Geolocation", (feature: Feature<any>) => {
            return this.getStyleForGeolocationFeature(feature);
        }, false, LayerGroupType.SystemNative, undefined, undefined, "__geolocation__");
        this._geolocation = new Geolocation({
            // enableHighAccuracy must be set to true to have the heading value.
            trackingOptions: {
                enableHighAccuracy: true,
            },
            projection: this.gifwMapInstance.olMap.getView().getProjection(),
        });
        // handle geolocation error.
        this._geolocation.on('error', (error) => {
            console.error(error);
        });
        this._geolocation.on('change:accuracyGeometry', () => {
            console.log('change:accuracyGeometry');
            if (!this._accuracyFeature) {
                this._accuracyFeature = new Feature();
                this._vectorSource.addFeature(this._accuracyFeature);
            }
            this._accuracyFeature.setGeometry(this._geolocation.getAccuracyGeometry());

        });
        this._geolocation.on('change:position', () => {
            if (!this._locationFeature) {
                this._locationFeature = new Feature();
                this._vectorSource.addFeature(this._locationFeature);
            }
            this._locationFeature.setGeometry(new Point(this._geolocation.getPosition()))
        });
    }

    private renderGeolocationControls() {

        let trackButton = document.createElement('button');
        trackButton.innerHTML = '<i class="bi bi-cursor"></i>';
        trackButton.setAttribute('title', 'Track my location');
        let trackElement = document.createElement('div');
        trackElement.className = 'gifw-geolocation-control ol-control';
        trackElement.appendChild(trackButton);
        this._trackControlElement = trackElement;
        this.element.appendChild(trackElement);
    }

    private addUIEvents() {
        this._trackControlElement.addEventListener('click', e => {
            if (this._trackControlElement.classList.contains('ol-control-active')) {
                //deactivate
                this._trackControlElement.classList.remove('ol-control-active');
                this._trackControlElement.querySelector('i.bi').className = 'bi bi-cursor';
                this.gifwMapInstance.resetInteractionsToDefault();
                this._trackControlElement.querySelector('button').blur();
                this._geolocation.setTracking(false);
            } else {
                //switch layer if it isn't on already
                if (!this._locationLayer.getVisible()) {
                    this._locationLayer.setVisible(true);
                }
                this._trackControlElement.classList.add('ol-control-active');
                this._trackControlElement.querySelector('i.bi').className =  'bi bi-cursor-fill';
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-geolocation-start'));
                this._geolocation.setTracking(true);
            }

        })

        
    }
    private getStyleForGeolocationFeature(feature: Feature<any>) {
        //const geometry = feature.getGeometry();
        //const type = geometry.getType();
        //switch (type) {
        //    case "Polygon":
        //    case "MultiPolygon":
        //        break;
        //    case "Point":
        //    case "MultiPoint":
        //        break;
        //    case "LineString":
        //    case "MultiLineString":
        //        break;
        //}
        let rgbColor = Util.Color.hexToRgb(this.gifwMapInstance.config.theme.primaryColour);

        return new Style({
            fill: new Fill({
                color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`
            }),
            stroke: new Stroke({
                color: `rgb(${rgbColor.r},${rgbColor.g},${rgbColor.b})`,
                width: 2,
            }),
            image: new CircleStyle({
                radius: 5,
                stroke: new Stroke({
                    color: 'rgba(255, 255, 255, 1)',
                    width: 2
                }),
                fill: new Fill({
                    color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 1)`
                }),
            }),
        });
    }
}
