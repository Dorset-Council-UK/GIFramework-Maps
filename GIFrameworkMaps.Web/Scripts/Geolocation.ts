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
import { GIFWPopupOptions } from "./Popups/PopupOptions";
import Spinner from "./Spinner";

export class GIFWGeolocation extends olControl {
    gifwMapInstance: GIFWMap;
    _geolocation: Geolocation;
    _trackControlElement: HTMLElement;
    _vectorSource: VectorSource;
    _locationLayer: VectorLayer<any>;
    _accuracyFeature: Feature<Polygon>;
    _locationFeature: Feature<Point>;
    _pathFeature: Feature<LineString>;
    _firstLocation: boolean = true;
    _minAccuracyThreshold: number = 50;
    _accuracyWarningInterval: number;
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
                timeout: 120_000 //2 minutes
            },
            projection: this.gifwMapInstance.olMap.getView().getProjection(),
        });
        // handle geolocation error.
        this._geolocation.on('error', (error) => {
            console.error(error);
            if (error.code === 1) {
                this.deactivateGeolocation();
                Util.Alert.showPopupError("Geolocation error", "You have denied access to your location. Please enable location services in your browser settings and refresh the page.");
            }
        });
        this._geolocation.on('change:accuracyGeometry', () => {
            this.renderPositionIndicatorOnMap();

        });
        this._geolocation.on('change:position', () => {
            this.renderPositionIndicatorOnMap();
        });
    }

    private renderPositionIndicatorOnMap() {
        
        if (this._geolocation.getAccuracy() > this._minAccuracyThreshold) {
            if (!this._accuracyWarningInterval) {
                this._accuracyWarningInterval = window.setInterval(() => {
                    Util.Alert.showTimedToast("Waiting for better accuracy", "Your location accuracy is too low. Waiting for a better signal.", Util.AlertSeverity.Warning)
                }, 10000);
            }
            return;
        }
        if (!this._accuracyFeature) {
            this._accuracyFeature = new Feature();
            this._vectorSource.addFeature(this._accuracyFeature);
        }
        if (!this._locationFeature) {
            this._locationFeature = new Feature();
            this._vectorSource.addFeature(this._locationFeature);
        }
        let popupOpts = new GIFWPopupOptions(`Your location accurate to ${this._geolocation.getAccuracy()}m`);
        this._locationFeature.set('gifw-popup-opts', popupOpts)
        this._locationFeature.set('gifw-popup-title', `Your location`)
        this._locationFeature.setGeometry(new Point(this._geolocation.getPosition()))
        this.gifwMapInstance.olMap.getView().setCenter(this._geolocation.getPosition());
        if (this._firstLocation) {
            this._trackControlElement.querySelector('button .spinner')?.remove();
            this._trackControlElement.querySelector('i.bi').classList.remove('d-none');
            this._firstLocation = false;
            window.clearInterval(this._accuracyWarningInterval);
            this._accuracyWarningInterval = null;
        }
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
                this.deactivateGeolocation();
                
            } else {
                this.activateGeolocation();
            }

        })

        
    }

    private deactivateGeolocation() {
        this._trackControlElement.classList.remove('ol-control-active');
        this._trackControlElement.querySelector('button .spinner')?.remove();
        this._trackControlElement.querySelector('i.bi').className = 'bi bi-cursor';
        this.gifwMapInstance.resetInteractionsToDefault();
        this._trackControlElement.querySelector('button').blur();
        this._geolocation.setTracking(false);
        this._locationLayer.setVisible(false);
        this._vectorSource.clear();
        this._locationFeature = null;
        this._accuracyFeature = null;
        window.clearInterval(this._accuracyWarningInterval);
        this._accuracyWarningInterval = null;
    }

    private activateGeolocation() {
        this._firstLocation = true;
        //switch layer on if it isn't on already
        if (!this._locationLayer.getVisible()) {
            this._locationLayer.setVisible(true);
        }
        this._trackControlElement.classList.add('ol-control-active');
        this._trackControlElement.querySelector('i.bi').className = 'bi bi-cursor-fill d-none';
        this._trackControlElement.querySelector('button').append(Spinner.create(['spinner-border-sm', 'text-white']));
        document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-geolocation-start'));
        this._geolocation.setTracking(true);
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
                color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`
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
