import ContextMenu, { CallbackObject, Item, SingleItem } from "ol-contextmenu";
import * as olProj from "ol/proj";
import { GIFWMousePositionControl } from "../Scripts/MousePositionControl";
import { Streetview } from "./Streetview";


export interface ContextMenuDataObject {
    mousePosition: GIFWMousePositionControl,
    coord: string
}
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
                } as ContextMenuDataObject,
                callback: function (obj: CallbackObject) {
                    navigator.clipboard.writeText((obj.data as ContextMenuDataObject).coord);
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
            for (const item of (this as ContextMenu).options.items) {
                if (typeof item === 'object') {
                    if ('data' in item) {
                        const itemData: ContextMenuDataObject = (item as SingleItem).data as ContextMenuDataObject;
                        
                        const projectionCode = itemData.mousePosition.projection;
                        const projectionString = itemData.mousePosition.getProjectionString(projectionCode);
                        const coordDecimals = itemData.mousePosition.decimals;
                        const clickCoord = this.map_.getCoordinateFromPixel(event.pixel);
                        const transformedCoord = olProj.transform(clickCoord, 'EPSG:3857', projectionString);
                        const coord = itemData.mousePosition.formatCoordinates(projectionCode, coordDecimals, transformedCoord);
                        itemData.coord = coord;
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

        });
    }
}
