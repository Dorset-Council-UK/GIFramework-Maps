import * as olProj from "ol/proj";
import { GIFWMousePositionControl } from "../Scripts/MousePositionControl";
import { Streetview } from "./Streetview";
const ContextMenu = require("ol-contextmenu");

export class GIFWContextMenu {
    control: typeof ContextMenu;
    items: {}[];
    streetviewInstance: Streetview;

    constructor(mousePosition: GIFWMousePositionControl) {
        this.setItems(mousePosition);
        this.setControl();
        this.addListeners();
        this.streetviewInstance = new Streetview('[apikeygoeshere]');
    }

    private setItems(mousePosition: GIFWMousePositionControl) {
        this.items = [
            {
                text: `Copy coordinates to clipboard`,
                classname: 'context-menu-item',
                data: {
                    mousePosition: mousePosition,
                    coord: ''
                },
                callback: function (obj: any) {
                    navigator.clipboard.writeText(obj.data.coord);
                }
            }
        ]
    }

    private setControl() {
        this.control = new ContextMenu({
            width: 'fit-content',
            defaultItems: false,
            items: this.items
        });
    }

    private addListeners() {
        this.control.on('beforeopen', function (event: any) {
            // Disables the context menu where a map control or popup is under the right click position, or where an element at that position contains a 'context-menu-disabled' class
            // Adapted from: https://github.com/jonataswalker/ol-contextmenu/issues/130
            let mapElement = this.map_.getTargetElement() as HTMLElement;
            let { top, left } = mapElement.getBoundingClientRect();
            let controlContainer = mapElement.querySelector('.ol-overlaycontainer-stopevent');
            let elementsAtClick = document.elementsFromPoint(event.pixel[0] + left, event.pixel[1] + top);
            if (elementsAtClick.some(el => el.classList.contains('context-menu-disabled') || controlContainer.contains(el))) {
                this.disable();
            } else {
                this.enable();
            }
        });
        this.control.on('open', function (event: any) {
            let item: any;
            for (item of this.options.items) {
                if (typeof item === 'object') {
                    if ('data' in item) {
                        if ('coord' in item.data) {
                            let projectionCode = item.data.mousePosition.projection;
                            let projectionString = item.data.mousePosition.getProjectionString(projectionCode);
                            let coordDecimals = item.data.mousePosition.decimals;
                            let clickCoord = this.map_.getCoordinateFromPixel(event.pixel);
                            let transformedCoord = olProj.transform(clickCoord, 'EPSG:3857', projectionString);
                            let coord = item.data.mousePosition.formatCoordinates(projectionCode, coordDecimals, transformedCoord);
                            item.data.coord = coord;
                            this.clear();
                            this.extend([
                                {
                                    text: coord,
                                    classname: 'context-menu-item-readonly'
                                },
                                '-'
                                ]);
                            this.extend(this.options.items);
                        }
                    }
                }
            }

        });
    }
}
