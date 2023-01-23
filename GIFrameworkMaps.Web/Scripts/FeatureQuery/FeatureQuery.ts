import { Control as olControl } from "ol/control";
import { Draw, Modify, Select } from "ol/interaction";
import { GIFWMap } from "../Map";
import { FeatureQuerySearch } from "./FeatureQuerySearch";

export class FeatureQuery extends olControl {
    gifwMapInstance: GIFWMap;
    pointActive: boolean;
    polygonActive: boolean;
    bufferActive: boolean;
    _featureQuerySearch: FeatureQuerySearch;
    _maxTimeout: number;
    _infoPointControlElement: HTMLElement;
    _infoAreaControlElement: HTMLElement;
    _infoBufferControlElement: HTMLElement;
    _infoToggleControlElement: HTMLElement;
    _keyboardEventAbortController: AbortController;

    constructor(gifwMapInstance: GIFWMap, active: boolean = true) {
        let infoControlElement = document.createElement('div');

        super({
            element: infoControlElement
        });
        
        this.gifwMapInstance = gifwMapInstance;
        this.pointActive = active;
        this.polygonActive = false;
        this.bufferActive = false;
        this._maxTimeout = 10000;
        this.renderInfoSearchControls();
        this.addUIEvents();
    }

    init() {
        this._featureQuerySearch = new FeatureQuerySearch(this.gifwMapInstance);
        this.gifwMapInstance.olMap.on('click', (evt) => {

            // Inhibit click interaction if actively drawing, modifying or selecting features
            let inhibit = false;
            this.gifwMapInstance.olMap.getInteractions().getArray().forEach((i) => {
                if (i instanceof Draw || i instanceof Select || i instanceof Modify) {
                    if (i.getActive()) {
                        inhibit = true;
                    }
                }
            });
            if (inhibit) {
                return;
            }
            if (this.pointActive) {
                this._featureQuerySearch.doInfoSearch(evt.coordinate, evt.pixel);
            } else if (this.bufferActive) {
                this._featureQuerySearch.doBufferSearch(evt.coordinate, evt.pixel);
            }
        });

        

        let mapContainer = document.getElementById(this.gifwMapInstance.id);
        mapContainer.addEventListener('gifw-feature-query-deactivate', () => {
            this.deactivate();
        });
        mapContainer.addEventListener('gifw-feature-query-activate', () => {
            document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-info-point-activate'));
        });

        mapContainer.addEventListener('gifw-info-point-activate', e => {

            this.activatePointSearch();

        })

        mapContainer.addEventListener('gifw-info-area-activate', e => {

            this.activateAreaSearch();

            
        })

        mapContainer.addEventListener('gifw-info-buffer-activate', e => {

            this.activateBufferSearch();
        })


        
    }

    private renderInfoSearchControls() {

        let infoButton = document.createElement('button');
        infoButton.innerHTML = `<i class="bi bi-info-circle"></i>`;
        infoButton.setAttribute('title', 'Open info search controls');
        let infoButtonElement = document.createElement('div');
        infoButtonElement.className = 'gifw-info-control ol-unselectable ol-control';
        infoButtonElement.appendChild(infoButton);

        let infoPointButton = document.createElement('button');
        infoPointButton.innerHTML = `<img src="${document.location.protocol}//${this.gifwMapInstance.config.appRoot}img/svg-icons/feature-query-point-icon.svg" alt="Click to query features icon" />`;
        infoPointButton.setAttribute('title', 'Query features by clicking');
        let infoPointElement = document.createElement('div');
        infoPointElement.className = 'gifw-info-point-control gifw-info-control ol-unselectable ol-control ol-hidden ol-control-active';
        infoPointElement.appendChild(infoPointButton);

        let infoAreaButton = document.createElement('button');
        infoAreaButton.innerHTML = '<i class="bi bi-pentagon"></i>';
        infoAreaButton.setAttribute('title', 'Query features by drawing a polygon');
        let infoAreaElement = document.createElement('div');
        infoAreaElement.className = 'gifw-info-polygon-control gifw-info-control ol-unselectable ol-control ol-hidden';
        infoAreaElement.appendChild(infoAreaButton);

        let infoBufferButton = document.createElement('button');
        infoBufferButton.innerHTML = '<i class="bi bi-circle"></i>';
        infoBufferButton.setAttribute('title', 'Query features by a buffer');
        let infoBufferElement = document.createElement('div');
        infoBufferElement.className = 'gifw-info-buffer-control gifw-info-control ol-unselectable ol-control ol-hidden';
        infoBufferElement.appendChild(infoBufferButton);

        this.element.appendChild(infoButtonElement);
        this.element.appendChild(infoPointElement);
        this.element.appendChild(infoAreaElement);
        this.element.appendChild(infoBufferElement);
        this._infoPointControlElement = infoPointElement;
        this._infoAreaControlElement = infoAreaElement;
        this._infoBufferControlElement = infoBufferElement;
        this._infoToggleControlElement = infoButtonElement;
    }

    private addUIEvents() {

        let infoButton = this._infoToggleControlElement.querySelector('button');
        let infoPointButton = this._infoPointControlElement.querySelector('button');
        let infoAreaButton = this._infoAreaControlElement.querySelector('button');
        let infoBufferButton = this._infoBufferControlElement.querySelector('button');

        infoButton.addEventListener('click', e => {
            //toggle visibility of sub controls
            if (this._infoPointControlElement.classList.contains('ol-hidden')) {
                //show controls
                this._infoPointControlElement.classList.remove('ol-hidden');
                this._infoAreaControlElement.classList.remove('ol-hidden');
                this._infoBufferControlElement.classList.remove('ol-hidden');
                infoButton.innerHTML = `<i class="bi bi-chevron-double-left"></i>`;
                infoButton.setAttribute('title', 'Collapse query controls');
            } else {
                this._infoPointControlElement.classList.add('ol-hidden');
                this._infoAreaControlElement.classList.add('ol-hidden');
                this._infoBufferControlElement.classList.add('ol-hidden');
                infoButton.innerHTML = `<i class="bi bi-info-circle"></i>`;
                infoButton.setAttribute('title', 'Open query controls');
            }
            infoButton.blur();

        })

        infoPointButton.addEventListener('click', e => {
            if (this._infoPointControlElement.classList.contains('ol-control-active')) {
                //deactivate
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-info-point-deactivate'));
                infoPointButton.blur();
            } else {
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-info-point-activate'));            }

        })

        infoAreaButton.addEventListener('click', e => {
            if (this._infoAreaControlElement.classList.contains('ol-control-active')) {
                //deactivate
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-info-area-deactivate'))
                infoAreaButton.blur();
            } else {
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-info-area-activate'))
            }
        })

        infoBufferButton.addEventListener('click', e => {
            if (this._infoBufferControlElement.classList.contains('ol-control-active')) {
                //deactivate
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-info-buffer-deactivate'))
                infoBufferButton.blur();
            } else {
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new Event('gifw-info-buffer-activate'))
            }
        })



    }

    

    public activatePointSearch() {

        this._featureQuerySearch._drawControl?.setActive(false);
        this.gifwMapInstance.olMap.removeInteraction(this._featureQuerySearch._drawControl);
        this.gifwMapInstance.deactivateInteractions();
        //this.gifwMapInstance.hidePopup();
        //add ol-control-active class
        this._infoPointControlElement.classList.add('ol-control-active');
        //remove ol-control-active class from other tools
        this._infoAreaControlElement.classList.remove('ol-control-active');
        this._infoBufferControlElement.classList.remove('ol-control-active');

        this.pointActive = true;
        this.bufferActive = false;
        this.polygonActive = false;
    }
    public activateAreaSearch() {
        this.gifwMapInstance.deactivateInteractions();
        this.gifwMapInstance.hidePopup();
        //add ol-control-active class
        this._infoAreaControlElement.classList.add('ol-control-active');
        //remove ol-control-active class from other tools
        this._infoPointControlElement.classList.remove('ol-control-active');
        this._infoBufferControlElement.classList.remove('ol-control-active');

        this.pointActive = false;
        this.bufferActive = false;
        this.polygonActive = true;

        this._featureQuerySearch.activateAreaQueryDrawing();
    }
    public activateBufferSearch() {

        this._featureQuerySearch._drawControl?.setActive(false);
        this.gifwMapInstance.olMap.removeInteraction(this._featureQuerySearch._drawControl);
        this.gifwMapInstance.deactivateInteractions();
        this.gifwMapInstance.hidePopup();
        //add ol-control-active class
        this._infoBufferControlElement.classList.add('ol-control-active');
        //remove ol-control-active class from other tools
        this._infoPointControlElement.classList.remove('ol-control-active');
        this._infoAreaControlElement.classList.remove('ol-control-active');

        this.pointActive = false;
        this.polygonActive = false;
        this.bufferActive = true;
    }

    public deactivate() {
        this._featureQuerySearch._drawControl?.setActive(false);
        this.gifwMapInstance.olMap.removeInteraction(this._featureQuerySearch._drawControl);

        //remove ol-control-active class from other tools
        this._infoPointControlElement.classList.remove('ol-control-active');
        this._infoAreaControlElement.classList.remove('ol-control-active');
        this._infoBufferControlElement.classList.remove('ol-control-active');

        this.pointActive = false;
        this.bufferActive = false;
        this.polygonActive = false;
    }
}