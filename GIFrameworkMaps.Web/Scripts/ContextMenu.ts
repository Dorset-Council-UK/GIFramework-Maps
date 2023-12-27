import ContextMenu, { Item } from "ol-contextmenu";
import * as olProj from "ol/proj";
import { GIFWMousePositionControl } from "../Scripts/MousePositionControl";
import { Streetview } from "./Streetview";

export class GIFWContextMenu {
    control: ContextMenu;
    items: Item[];
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
            width: 'fit-content' as unknown as number,
            defaultItems: false,
            items: this.items
        });
    }

    private addListeners() {
        this.control.on('beforeopen', function (event) {
            // Disables the context menu where a map control or popup is under the right click position, or where an element at that position contains a 'context-menu-disabled' class
            // Adapted from: https://github.com/jonataswalker/ol-contextmenu/issues/130
            const mapElement = this.map_.getTargetElement() as HTMLElement;
            const { top, left } = mapElement.getBoundingClientRect();
            const controlContainer = mapElement.querySelector('.ol-overlaycontainer-stopevent');
            const elementsAtClick = document.elementsFromPoint(event.pixel[0] + left, event.pixel[1] + top);
            if (elementsAtClick.some(el => el.classList.contains('context-menu-disabled') || controlContainer.contains(el))) {
                this.disable();
            } else {
                this.enable();
            }
        });
        this.control.on('open', function (event) {
            let item: any;
            for (item of this.options.items) {
                if (typeof item === 'object') {
                    if ('data' in item) {
                        if ('coord' in item.data) {
                            const projectionCode = item.data.mousePosition.projection;
                            const projectionString = item.data.mousePosition.getProjectionString(projectionCode);
                            const coordDecimals = item.data.mousePosition.decimals;
                            const clickCoord = this.map_.getCoordinateFromPixel(event.pixel);
                            const transformedCoord = olProj.transform(clickCoord, 'EPSG:3857', projectionString);
                            const coord = item.data.mousePosition.formatCoordinates(projectionCode, coordDecimals, transformedCoord);
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
