import * as olControl from "ol/control";
import * as olProj from "ol/proj";
import { toStringHDMS } from 'ol/coordinate';
import { Modal } from "bootstrap";
import { Util } from "../Scripts/Util";

/**
  * A customised mouse position control that handles BNG Alphanumeric and setting decimal places
  *
  * @remarks
  * This class uses the non-existent EPSG code 277001 to represent BNG Alphanumeric, as it is not a real projection, just a representation.
  * This class uses the non-existent EPSG code 43261 to represent Lat/Lon in Degrees/Minutes/Seconds, as it is not a real projection, just a representation.
  */

export class GIFWMousePositionControl {
    projection: string;
    decimals: number;
    control: olControl.MousePosition;

    constructor(startProjection:string, decimals:number) {
        this.projection = startProjection;
        this.decimals = decimals;
        this.init();
    }

    public init():olControl.MousePosition {
        let bng = olProj.get('EPSG:27700');

        let mousePosition = new olControl.MousePosition({
            projection: bng,
            coordinateFormat: function (coord) {
                return `<a href="#" class="stretched-link text-body text-decoration-none" title="Click to configure" id="coordinate-configurator">X: ${coord[0].toFixed(0)} Y: ${coord[1].toFixed(0)}</a>`;
            }
        });

        this.attachCoordConfiguratorControls();
        this.control = mousePosition;
        return this.control;
    }

    private attachCoordConfiguratorControls(): void{
        //add coordinate configurator
        document.getElementById('giframeworkMap').addEventListener('click', e => {
            if ((e.target as HTMLAnchorElement).id === 'coordinate-configurator') {
                //open modal for metadata
                let coordConfiguratorModal = new Modal(document.getElementById('coordinate-configurator-modal'), {});
                (document.getElementById('coordConfigProjection') as HTMLSelectElement).value = this.projection;
                (document.getElementById('coordConfigDecimals') as HTMLInputElement).value = this.decimals.toString();
                if (this.projection !== "277001") {
                    (document.getElementById('coordConfigDecimals') as HTMLInputElement).disabled = false;
                }
                coordConfiguratorModal.show();
                e.preventDefault();
            }
        });
        document.getElementById('coordConfigForm').addEventListener('submit', e => {

            let newProj = (document.getElementById('coordConfigProjection') as HTMLSelectElement).value;
            let decimals = (document.getElementById('coordConfigDecimals') as HTMLInputElement).value;
            this.setDisplayProjection(newProj, parseInt(decimals));
            let coordConfiguratorModal = Modal.getInstance(document.getElementById('coordinate-configurator-modal'));
            coordConfiguratorModal.hide();
            e.preventDefault();
        });

        document.getElementById('coordConfigProjection').addEventListener('change', e => {
            let defaultDecimalPlaces = (e.target as HTMLSelectElement).options[(e.target as HTMLSelectElement).selectedIndex].dataset.gifwDefaultDecimals;
            if (defaultDecimalPlaces === undefined) {
                (document.getElementById('coordConfigDecimals') as HTMLInputElement).value = "0";
                (document.getElementById('coordConfigDecimals') as HTMLInputElement).disabled = true;
            } else {
                (document.getElementById('coordConfigDecimals') as HTMLInputElement).disabled = false;
                (document.getElementById('coordConfigDecimals') as HTMLInputElement).value = defaultDecimalPlaces;
            }

        });
    }

    public setDisplayProjection(code: string, decimals: number) {
        let _this = this;
        let coordTemplate = this.coordTemplate;
        this.control.setProjection(this.getProjectionString(code));
        this.control.setCoordinateFormat(function (coord) {
            return coordTemplate(_this.formatCoordinates(code, decimals, coord));
        });
        this.projection = code;
        this.decimals = decimals;
    }

    public getProjectionString(code: string) {
        if (code === '277001') {
            return `EPSG:27700`;
        } else if (code === "43261") {
            return `EPSG:4326`;
        } else {
            return `EPSG:${code}`;
        }
    }

    public formatCoordinates(code: string, decimals: number, coord: number[]): string {
        let x = coord[0];
        let y = coord[1];
        if (code === '277001') {
            //this is a funny one that requires specific handling, hence the fake EPSG Code
            //do coord conversion
            return Util.Projection.convertBNGToAlpha(x, y, true);
        } else if (code === "43261") {
            //this is a funny one that requires specific handling, hence the fake EPSG Code
            //do coord conversion
            return toStringHDMS([x, y], decimals);
        } else if (code === "4326") {
            /*lat/lon requires flipping the x/y values*/
            return `Lat: ${y.toFixed(decimals)} Lon: ${x.toFixed(decimals)}`;
        } else {
            return `X: ${x.toFixed(decimals)} Y: ${y.toFixed(decimals)}`;
        }
    }

    public formatCoordinatesAsArray(code: string, decimals: number, coord: number[]): string[] {
        let x = coord[0];
        let y = coord[1];
        if (code === '277001') {
            //this is a funny one that requires specific handling, hence the fake EPSG Code
            //do coord conversion
            return [Util.Projection.convertBNGToAlpha(x, y, true)];
        } else if (code === "43261") {
            //this is a funny one that requires specific handling, hence the fake EPSG Code
            //do coord conversion
            let fullString = toStringHDMS([x, y], decimals);
            //don't judge me for this nastiness.
            let splitString = fullString.split(/(N|S)/);
            return [`${splitString[0]}${splitString[1]}`,`${splitString[2].trim()}`]
        } else if (code === "4326") {
            /*lat/lon requires flipping the x/y values*/
            return [`Lat: ${y.toFixed(decimals)}`,`Lon: ${x.toFixed(decimals)}`];
        } else {
            return [`X: ${x.toFixed(decimals)}`,`Y: ${y.toFixed(decimals)}`];
        }
    }

    private coordTemplate(coordString: string): string {
        return `<a href="#" class="stretched-link text-body text-decoration-none" title="Click to configure" id="coordinate-configurator">${coordString}</a>`;;
    }
}