import { GIFWMap } from "./Map";
import { Control as olControl } from "ol/control";
import Geolocation from "ol/Geolocation";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import VectorLayer from "ol/layer/Vector";
import { Fill, RegularShape, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { Util } from "./Util";
import { Point, LineString} from "ol/geom";
import Spinner from "./Spinner";
import { Modal } from "bootstrap";
import { transform } from "ol/proj";
import { GPX } from "ol/format";
import { GIFWPopupOptions } from "./Popups/PopupOptions";
import { GIFWPopupAction } from "./Popups/PopupAction";
import { getLength } from "ol/sphere";

export class GIFWGeolocation extends olControl {
    gifwMapInstance: GIFWMap;
    olGeolocation: Geolocation;
    optionsModal: Modal;
    exportModal: Modal;
    firstLocation: boolean = true;
    minAccuracyThreshold: number = 150;
    accuracyWarningInterval: number;
    drawPath: boolean = true;
    wakeLockAvailable: boolean = false;
    useWakeLock: boolean = false;
    wakeLock: WakeLockSentinel = null;
    _trackControlElement: HTMLElement;
    _locationVectorSource: VectorSource;
    _pathVectorSource: VectorSource;
    _locationLayer: VectorLayer<any>;
    _pathLayer: VectorLayer<any>;
    _locationFeature: Feature<Point>;
    _pathFeature: Feature<LineString>;
    _simulationMode: boolean = true;
    _simModeIndex: number = 0;
    _simModeIntervalTimer: number;
    constructor(gifwMapInstance: GIFWMap) {

        let geolocationControlElement = document.createElement('div');

        super({
            element: geolocationControlElement
        })

        this.gifwMapInstance = gifwMapInstance;
        if ('wakeLock' in navigator) {
            this.wakeLockAvailable = true;
            this.useWakeLock = true;
        }
        this.renderGeolocationControls();
        this.addUIEvents();
    }

    public init() {
        this.optionsModal = Modal.getOrCreateInstance('#geolocation-options-modal');
        this.exportModal = Modal.getOrCreateInstance('#geolocation-export-modal');
        this._locationVectorSource = new VectorSource();
        this._pathVectorSource = new VectorSource();
        this._locationLayer = this.gifwMapInstance.addNativeLayerToMap(this._locationVectorSource, "Geolocation", (feature: Feature<any>) => {
            return this.getStyleForGeolocationFeature(feature);
        }, false, LayerGroupType.SystemNative, undefined, false, "__geolocation__");
        this._pathLayer = this.gifwMapInstance.addNativeLayerToMap(this._pathVectorSource, "Geolocation - Path", undefined, false, LayerGroupType.SystemNative, undefined, true, "__geolocation_path__");
        this.olGeolocation = new Geolocation({
            // enableHighAccuracy must be set to true to have the heading value.
            trackingOptions: {
                enableHighAccuracy: true,
                timeout: 120_000 //2 minutes
            },
            projection: this.gifwMapInstance.olMap.getView().getProjection(),
        });
        // handle geolocation error.
        this.olGeolocation.on('error', (error) => {
            console.error(error);
            this.deactivateGeolocation();
            let msg = "An error occurred while trying to get your location.";
            switch (error.code) {
                case 1:
                    msg = "You have denied access to your location. Please enable location services in your browser settings and refresh the page.";
                case 3:
                    msg = "It took too long to get your location. Make sure you are in an area with a clear view of the sky for best results."
                    
            }
            Util.Alert.showPopupError("Geolocation error", msg);

        });
        this.olGeolocation.on('change:accuracyGeometry', () => {
            this.renderPositionIndicatorOnMap();

        });
        this.olGeolocation.on('change:position', () => {
            this.renderPositionIndicatorOnMap();
        });
        if (this._simulationMode) {
            
            this.olGeolocation.getAccuracy = () => { return this.simulatedAccuracy[Math.floor(Math.random() * (this.simulatedAccuracy.length - 0 + 1) + 0)];}
            this.olGeolocation.getHeading = () => { return this.simulatedHeading[Math.floor(Math.random() * (this.simulatedHeading.length - 0 + 1) + 0)];}
            this.olGeolocation.getPosition = () => {return transform(this.simulatedCoordinates[this._simModeIndex],'EPSG:4326','EPSG:3857');}

        }
    }

    private renderPositionIndicatorOnMap() {
        let position = this.olGeolocation.getPosition();
        let heading = this.olGeolocation.getHeading();
        let accuracy = this.olGeolocation.getAccuracy();
        console.debug('Accuracy', accuracy);
        console.debug('Location', position);
        console.debug('Heading', heading);
        if (accuracy > this.minAccuracyThreshold) {
            if (!this.accuracyWarningInterval) {
                this.accuracyWarningInterval = window.setInterval(() => {
                    Util.Alert.showTimedToast("Waiting for better accuracy", "Your location accuracy is too low. Waiting for a better signal.", Util.AlertSeverity.Warning)
                }, 10000);
            }
            return;
        }
        if (!this._locationFeature) {
            this._locationFeature = new Feature();
            this._locationVectorSource.addFeature(this._locationFeature);
        }
        if (this.drawPath) {
            if (!this._pathFeature) {
                this._pathFeature = new Feature();
                this._pathVectorSource.addFeature(this._pathFeature);
                let popupDownloadAction = new GIFWPopupAction("Download this path as a GPX file", this.downloadGPX.bind(this), false, true);
                let popupClearPathAction = new GIFWPopupAction("Remove path from map", () => {
                    this._pathVectorSource.clear();
                    this._pathFeature = null;
                    this._pathLayer.setVisible(false)
                }, true, true);
                let timestamp = new Date().toLocaleTimeString();
                let popupOpts = new GIFWPopupOptions(`<h1>Your path</h1><p><strong>Started:</strong> ${timestamp}</p>`,[popupDownloadAction,popupClearPathAction]);
                this._pathFeature.set('gifw-popup-opts', popupOpts)
                this._pathFeature.set('gifw-popup-title', `Your path`)
            }
        }
        this._locationFeature.set('gifw-heading', heading);
        this._locationFeature.setGeometry(new Point(position));

        this.gifwMapInstance.olMap.getView().animate({ center: position, duration: 500 });
        if (this.firstLocation) {
            this._trackControlElement.querySelector('button .spinner')?.remove();
            this._trackControlElement.querySelector('i.bi').classList.remove('d-none');
            this.firstLocation = false;
            window.clearInterval(this.accuracyWarningInterval);
            this.accuracyWarningInterval = null;
            if (this.drawPath) {
                //This is a bit of a hack as LineString requires 2 coordinates, but at this point, we only have one.
                //we could keep a reference to the first coordinate until we get the second one, but this seemed simpler
                this._pathFeature.setGeometry(new LineString([position,position]))
            }
        } else {
            if (this.drawPath) {
                this._pathFeature.getGeometry().appendCoordinate(position);
            }
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

        //set up the options modal
        (document.querySelector('#geolocation-options-modal #geolocationScreenLock') as HTMLInputElement).checked = this.useWakeLock;
        if (!this.wakeLockAvailable) {
            document.querySelector('#geolocation-options-modal #geolocationScreenLock').setAttribute('disabled', '');
            document.querySelector('#geolocation-options-modal #geolocationScreenLockHelpText').textContent = `This feature is not available in your browser`;
            document.querySelector('#geolocation-options-modal #geolocationScreenLockHelpText').classList.add('text-danger');
        }
        (document.querySelector('#geolocation-options-modal #geolocationDrawTrack') as HTMLInputElement).checked = this.drawPath;
        
    }

    private addUIEvents() {
        this._trackControlElement.addEventListener('click', e => {
            if (this._trackControlElement.classList.contains('ol-control-active')) {
                this.deactivateGeolocation();
            } else {
                this.optionsModal.show();
            }

        })

        document.querySelector('#geolocation-options-modal .btn-primary').addEventListener('click', e => {
            this.drawPath = (document.querySelector('#geolocation-options-modal #geolocationDrawTrack') as HTMLInputElement).checked;
            this.useWakeLock = (document.querySelector('#geolocation-options-modal #geolocationScreenLock') as HTMLInputElement).checked;
            this.activateGeolocation();
        });

        document.querySelector('#geolocation-export-modal .btn-primary').addEventListener('click', e => {
            (e.currentTarget as HTMLButtonElement).disabled = true;
            //download feature
            this.downloadGPX();
            (e.currentTarget as HTMLButtonElement).disabled = false;
            this.exportModal.hide();
        });

        
    }

    private downloadGPX() {
        let formatter = new GPX();
        let gpx = formatter.writeFeatures(this._pathVectorSource.getFeatures(), {
            featureProjection: this.gifwMapInstance.olMap.getView().getProjection()
        });
        let blob = new Blob([gpx], {
            type: 'application/gpx+xml'
        });
        let url = URL.createObjectURL(blob);
        let downloadLink = document.createElement('a');
        downloadLink.href = url;
        let timestamp = new Date().toISOString();
        downloadLink.download = `GPXTrack_${timestamp}.gpx`;
        downloadLink.click();
    }

    private deactivateGeolocation() {
        this._trackControlElement.classList.remove('ol-control-active');
        this._trackControlElement.querySelector('button .spinner')?.remove();
        this._trackControlElement.querySelector('i.bi').className = 'bi bi-cursor';
        this.gifwMapInstance.resetInteractionsToDefault();
        this._trackControlElement.querySelector('button').blur();
        this.olGeolocation.setTracking(false);
        this._locationLayer.setVisible(false);
        this._locationVectorSource.clear();
        this._locationFeature = null;

        if (this.drawPath) {
            if (this._pathFeature.getGeometry().getCoordinates().length > 2) {
                //show modal with download GPX link
                let length = Math.round(getLength(this._pathFeature.getGeometry()));
                let lengthStr = length.toString();
                let unit = "m"
                if (length > 1000) {
                    length = (length / 100);
                    lengthStr = length.toFixed(2);
                    unit = "km";
                }
                document.querySelector('#geolocation-export-modal #geolocation-export-track-length').textContent = `${lengthStr}${unit}`
                this.exportModal.show();
            }
        }

        window.clearInterval(this.accuracyWarningInterval);
        this.accuracyWarningInterval = null;

        if (this.wakeLock && !this.wakeLock?.released) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        if (this._simulationMode) {
            window.clearInterval(this._simModeIntervalTimer);
        }
    }

    private activateGeolocation() {

        this.firstLocation = true;
        //switch layer on if it isn't on already
        if (!this._locationLayer.getVisible()) {
            this._locationLayer.setVisible(true);
        }
        if (this.drawPath) {
            if (!this._pathLayer.getVisible()) {
                this._pathLayer.setVisible(true);
            }
        }
        this._trackControlElement.classList.add('ol-control-active');
        this._trackControlElement.querySelector('i.bi').className = 'bi bi-cursor-fill d-none';
        this._trackControlElement.querySelector('button').append(Spinner.create(['spinner-border-sm', 'text-white']));
        document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-geolocation-start'));
        this.olGeolocation.setTracking(true);

        if (this.useWakeLock) {
            this.requestWakeLock();
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }
        if (this._simulationMode) {
            this._simModeIntervalTimer = window.setInterval(() => {
                this._simModeIndex += 1;
                if (this._simModeIndex == this.simulatedCoordinates.length) {
                    this._simModeIndex = 0;
                }
                this.olGeolocation.dispatchEvent('change:position')
            }, 2000);
        }

    }

    private async requestWakeLock() {
        if (this.wakeLockAvailable) {
            try {
                this.wakeLock = await navigator.wakeLock.request("screen");
                console.log("Wake Lock is active!");
            } catch (err) {
                // The Wake Lock request has failed - usually system related, such as battery.
                console.error(`${err.name}, ${err.message}`);
            }
        }
    }

    private handleVisibilityChange() {
        if (this.wakeLock !== null && document.visibilityState === 'visible') {
            this.requestWakeLock();
        }
    }

    private getStyleForGeolocationFeature(feature: Feature<any>) {

        let rgbColor = Util.Color.hexToRgb(this.gifwMapInstance.config.theme.primaryColour);

        let fill = new Fill({
            color: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 1)`
        });
        let stroke = new Stroke({
            color: 'rgba(255, 255, 255, 1)',
            width: 2
        });
        let circle = new Style({
            image: new CircleStyle({
                radius: 7,
                stroke: stroke,
                fill: fill,
            }),
        })

        let arrow = new Style({
            image: new RegularShape({
                fill: fill,
                stroke: stroke,
                points: 3,
                radius: (feature.get('gifw-heading') === undefined ? 0 : 7), //make the pointer disappear if no heading defined
                displacement: [0, 12],
                rotation: feature.get('gifw-heading'),
                
            })
        });


        return [circle,arrow];
    }

    private simulatedCoordinates: number[][] = [[
        -2.441370637422439,
        50.71416976895679
    ],
    [
        -2.441376001840468,
        50.71411542183668
    ],
    [
        -2.4413652730044086,
        50.71406786805488
    ],
    [
        -2.4413652730044086,
        50.71401691752084
    ],
    [
        -2.441418132147921,
        50.71397508004904
    ],
    [
        -2.4414189171847065,
        50.71391841299797
    ],
    [
        -2.441451103692885,
        50.71380632139255
    ],
    [
        -2.4414993834551537,
        50.713731593506736
    ],
    [
        -2.441601307397719,
        50.71365007204085
    ],
    [
        -2.4417890620287617,
        50.71361270798823
    ],
    [
        -2.441892969926586,
        50.713596443757694
    ],
    [
        -2.4420197320040424,
        50.7135923275834
    ],
    [
        -2.4419499945696552,
        50.71354817000909
    ],
    [
        -2.4420411896761616,
        50.713507409134365
    ],
    [
        -2.4420626473482807,
        50.71344626775584
    ],
    [
        -2.4420572829302514,
        50.71338512629751
    ],
    [
        -2.4420143675860126,
        50.71330700098474
    ],
    [
        -2.4419017148073876,
        50.713228875541716
    ],
    [
        -2.4417515111025536,
        50.713126972594324
    ],
    [
        -2.4416978669222558,
        50.71307262426512
    ],
    [
        -2.4416495871599873,
        50.712889198188805
    ],
    [
        -2.441558392053481,
        50.712838246373536
    ],
    [
        -2.4414618325289448,
        50.712760120149284
    ],
    [
        -2.4413974595125874,
        50.71273294577989
    ],
    [
        -2.441268713479873,
        50.712729548982594
    ],
    [
        -2.441172153955337,
        50.712770310533756
    ],
    [
        -2.4411292386110985,
        50.712838246373536
    ],
    [
        -2.4411131453570087,
        50.712892594974534
    ],
    [
        -2.4410863232668603,
        50.71296732419793
    ],
    [
        -2.44108095884883,
        50.713038656527345
    ],
    [
        -2.4411238741930683,
        50.71308960812476
    ],
    [
        -2.4412257981356347,
        50.71315754350181
    ],
    [
        -2.4413491797503193,
        50.7131949079172
    ],
    [
        -2.4413545441683495,
        50.713303604229054
    ],
    [
        -2.441392095094558,
        50.713422490531514
    ],
    [
        -2.4413169932421406,
        50.713537979793756
    ],
    [
        -2.4412284536801754,
        50.7136139327813
    ],
    [
        -2.4412043404635155,
        50.71369762624653
    ],
    [
        -2.441247255807754,
        50.71383349513971
    ],
    [
        -2.4413169932421406,
        50.71395238009822
    ],
    [
        -2.441376001840468,
        50.71411542183668
    ],
    [
        -2.4413384509142597,
        50.71422411601392
    ]];
    private simulatedHeading: number[] = [0.08726646, 0.2617994, undefined, 3.316126, 3.141593, 5.061455];
    private simulatedAccuracy: number[] = [4, 3, 1, 8, 7, 5];
}
