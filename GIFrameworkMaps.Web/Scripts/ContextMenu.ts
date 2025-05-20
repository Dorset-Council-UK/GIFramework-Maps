import ContextMenu, { CallbackObject, Item, SingleItem } from "ol-contextmenu";
import * as olProj from "ol/proj";
import { GIFWMousePositionControl } from "../Scripts/MousePositionControl";
import { PrefersReducedMotion } from "./Util";

export interface ContextMenuDataObject {
  mousePosition: GIFWMousePositionControl;
  coord: string;
}
export class GIFWContextMenu {
  control: ContextMenu;
  items: Item[];

  constructor(mousePosition: GIFWMousePositionControl) {
    this.setItems(mousePosition);
    this.setControl();
    this.addListeners();
  }

  private setItems(mousePosition: GIFWMousePositionControl) {
    this.items = [
      {
        text: `Copy coordinates to clipboard`,
        classname: "context-menu-item",
        data: {
          mousePosition: mousePosition,
          coord: "",
        } as ContextMenuDataObject,
        callback: function (obj: CallbackObject) {
          navigator.clipboard.writeText(
            (obj.data as ContextMenuDataObject).coord,
          );
        },
      },
      {
        text: `Centre map here`,
        classname: "context-menu-item",
        data: {
          mousePosition: mousePosition,
        } as ContextMenuDataObject,
        callback: function (obj: CallbackObject) {
          if (PrefersReducedMotion()) {
            mousePosition.control.getMap().getView().setCenter(obj.coordinate);
          } else {
            mousePosition.control
              .getMap()
              .getView()
              .animate({ center: obj.coordinate, duration: 500 });
          }
        },
      },
    ];
  }

  private setControl() {
    this.control = new ContextMenu({
      width: "fit-content" as unknown as number,
      defaultItems: false,
      items: this.items,
    });
  }

  private addListeners() {
    this.control.on("beforeopen", function (event) {
      // Disables the context menu where a map control or popup is under the right click position, or where an element at that position contains a 'context-menu-disabled' class
      // Adapted from: https://github.com/jonataswalker/ol-contextmenu/issues/130
      const mapElement = this.map_.getTargetElement() as HTMLElement;
      const { top, left } = mapElement.getBoundingClientRect();
      const controlContainer = mapElement.querySelector(
        ".ol-overlaycontainer-stopevent",
      );
      const elementsAtClick = document.elementsFromPoint(
        event.pixel[0] + left,
        event.pixel[1] + top,
      );
      if (
        elementsAtClick.some(
          (el) =>
            el.classList.contains("context-menu-disabled") ||
            controlContainer.contains(el),
        )
      ) {
        this.disable();
      } else {
        this.enable();
      }
    });
    this.control.on("open", (event) => {
      for (const item of (this.control as ContextMenu).options.items) {
        if (typeof item === "object") {
          if ("data" in item) {
            const itemData: ContextMenuDataObject = (item as SingleItem)
              .data as ContextMenuDataObject;

            const projectionCode = itemData.mousePosition.projection;
            const projectionString =
              itemData.mousePosition.getProjectionString(projectionCode);
            const coordDecimals = itemData.mousePosition.decimals;
            const clickCoord = this.control
              .getMap()
              .getCoordinateFromPixel(event.pixel);
            const transformedCoord = olProj.transform(
              clickCoord,
              this.control.getMap().getView().getProjection(),
              projectionString,
            );
            const displayCoord = itemData.mousePosition.formatCoordinates(
              projectionCode,
              coordDecimals,
              transformedCoord,
            );
            const clipboardCoord =
              itemData.mousePosition.formatCoordinatesAsArray(
                projectionCode,
                coordDecimals,
                transformedCoord,
                false,
              );
            itemData.coord = clipboardCoord.join(", ");
            this.control.clear();
            this.control.extend([
              {
                text: displayCoord,
                classname: "context-menu-item-readonly",
              } as Item,
              "-",
            ]);
            this.control.extend(this.control.options.items);
          }
        }
      }
    });
  }
}
