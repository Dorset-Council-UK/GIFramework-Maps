import { Overlay } from "ol";

export class GIFWPopupOverlay {
    element: HTMLElement;
    overlay: Overlay;
    constructor(element:HTMLElement) {
        this.element = element;
        this.init();
    }

    public init():void {
        const closerEle = document.getElementById('gifw-popup-closer');
        const overlay = new Overlay({
            element: this.element,
            autoPan: {
                margin: 60,
                animation: { duration: 250 }
            }
        });
        this.overlay = overlay;
        closerEle.addEventListener('click', () => {
            overlay.setPosition(undefined);
            closerEle.blur;
            return false;
        });
        
    }
}