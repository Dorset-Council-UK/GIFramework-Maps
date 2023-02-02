import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { GIFWMap } from "../Map";
import { Sidebar } from "../Sidebar";
import Fuse from "fuse.js";
import Sortable from "sortablejs";
import { Util } from "../Util";
import { Layer as olLayer } from "ol/layer";
import { Collapse, Modal, Tooltip } from "bootstrap";
import Badge from "../Badge";
import Spinner from "../Spinner";
import TileSource from "ol/source/Tile";
import VectorSource from "ol/source/Vector";
import ImageSource from "ol/source/Image";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer } from "../Interfaces/Layer";
import { LayerListSortingOption } from "../Interfaces/LayerPanel/LayerListSortingOption";
import BaseLayer from "ol/layer/Base";
import { LayerUpload } from "../LayerUpload";
import { LayerList } from "./LayerList";
import { Category } from "../Interfaces/Category";
import { ImageWMS, TileWMS } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { Metadata } from "../Metadata/Metadata";
import { Style } from "../Interfaces/OGCMetadata/Style";
import ImageLayer from "ol/layer/Image";
import { LayerFilter } from "../LayerFilter";

export class LayersPanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;
    listSortOrder: LayerListSortingOption = LayerListSortingOption.Default;
    _fuseInstance: Fuse<any>;
    private previousZoom: number;
    private loadingLayers: {
        [name: string]: {
            count: number,
            timeout?: ReturnType<typeof setTimeout>
        }
    };
    private erroredLayers: BaseLayer[];

    constructor(container: string) {
        this.container = container;
        this.erroredLayers = [];
        this.loadingLayers = {};
    }
    init() {
        this.previousZoom = Math.ceil(this.gifwMapInstance.olMap.getView().getZoom());
        this.attachCloseButton();
        this.attachControls();
        this.attachLayerEventListeners();
        this.renderLayerList();
        this.renderActiveLayerList();
        this.setLayerVisibilityState();
        this.gifwMapInstance.olMap.getOverlayContainer().addEventListener('gifw-layer-added', e => {
            this.attachStandardEventListenersToLayer((e as CustomEvent).detail);
            this.updateControlState();
            this.renderLayerList();
            this.renderActiveLayerList();
        })
        this.gifwMapInstance.olMap.getOverlayContainer().addEventListener('gifw-layer-removed', e => {
            this.updateControlState();
            this.removeLayerFromList((e as CustomEvent).detail);
            this.renderActiveLayerList();
        })
    };
    render() {
        this.updateControlState();
    };

    /**
    * Renders (or re-renders) the Layers tab
    *
    * @returns void
    *
    */
    private renderLayerList(): void {
        let layerList = new LayerList(this)
        let layerListContainer = document.querySelector(this.container).querySelector('.layer-switcher-tree');
        layerListContainer.innerHTML = '';
        layerListContainer.appendChild(layerList.createLayerList());
        let collapseElementList = [].slice.call(layerListContainer.querySelectorAll('.collapse'))
        collapseElementList.map((collapseEl: Element) => {
            collapseEl.addEventListener('hide.bs.collapse', (e) => {
                let categoryId = (e.currentTarget as HTMLElement).id.replace('category-','')
                this.gifwMapInstance.config.categories.filter(c => c.id.toString() === categoryId)[0].open = false;
                
            })
            collapseEl.addEventListener('show.bs.collapse', (e) => {
                let categoryId = (e.currentTarget as HTMLElement).id.replace('category-', '')
                this.gifwMapInstance.config.categories.filter(c => c.id.toString() === categoryId)[0].open = true;
            })
            return new Collapse(collapseEl, { toggle: false });
        })
        /*re-run the search*/
        this.createOrUpdateFuseInstance();
        let container = document.querySelector(this.container);
        let searchInput: HTMLInputElement = container.querySelector('#gifw-layer-switcher-search');
        this.filterLayersListByText(searchInput.value.trim());
    }

    /**
    * Renders the Active Layers tab with whatever layers are on in a Sortable list 
    *
    * @returns void
    *
    */
    private renderActiveLayerList(): void {
        let container = document.querySelector(this.container);
        let activeLayersContainer = container.querySelector('#gifw-layer-control-active-layers');
        if (this.gifwMapInstance.anyOverlaysOn()) {
            let layerGroups = this.gifwMapInstance.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])

            let layers: olLayer<any, any>[] = [];
            layerGroups.forEach(lg => {
                layers = layers.concat(lg.olLayerGroup.getLayersArray());
            })

            let switchedOnLayers = layers.filter(l => l.getVisible() === true);

            //let curZoom = Math.ceil(this.gifwMapInstance.olMap.getView().getZoom());
            activeLayersContainer.innerHTML = '<p class="text-muted mt-2">Drag layers using the drag handle <i class="bi bi-arrows-move"></i> to reorder them on the map</p>';
            let accordion = document.createElement('div');
            accordion.classList.add("accordion","mt-2","active-layers-list");
            switchedOnLayers.sort((a, b) => b.getZIndex() - a.getZIndex()).forEach(l => {
                let layerId = l.get('layerId');
                let layerConfig = this.gifwMapInstance.getLayerConfigById(layerId);
                let layerHtml = `
                    <div class="accordion-item" data-gifw-layer-id="${layerId}" id="active-layer-${layerId}">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#layer-styling-${layerId}" aria-expanded="false" aria-controls="layer-styling-${layerId}">
                                <i class="bi bi-arrows-move me-2 handle"></i>
                                <span class="me-2">${l.get('name')}</span>
                            </button>
                        </h2>
                        <div id="layer-styling-${layerId}" class="accordion-collapse collapse" aria-labelledby="active-layer-${layerId}">
                            <div class="accordion-body">
                                <div class="accordion accordion-flush">
                                    <label for="layers-transparency-${layerId}" class="form-label">Transparency</label>
                                    <input type="range" class="form-range" value="${l.getOpacity() * 100}" data-gifw-controls-transparency-layer="${layerId}" id="layer-transparency-${layerId}">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" ${l.getOpacity() === 0 ? "checked" : ""} data-gifw-controls-invisible-layer="${layerId}" id="layers-invisible-check-${layerId}">
                                        <label class="form-check-label" for="layers-invisible-check-${layerId}">
                                            Invisible
                                        </label>
                                    </div>
                                    <label for="layers-saturation-${layerId}" class="form-label">Saturation</label>
                                    <input type="range" class="form-range" value="${l.get('saturation') !== undefined ? l.get('saturation') : 100}" data-gifw-controls-saturation-layer="${layerId}" id="layers-saturation-${layerId}">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" ${l.get('saturation') === 0 ? "checked" : ""} data-gifw-controls-greyscale-layer="${layerId}" id="layers-greyscale-check-${layerId}">
                                        <label class="form-check-label" for="layers-greyscale-check-${layerId}">
                                            Greyscale
                                        </label>
                                    </div>
                                    ${l.getSource() instanceof TileWMS || l.getSource() instanceof ImageWMS ? `<button type="button" class="btn btn-outline-primary mt-3" id="layers-alt-styles-${layerId}" data-gifw-controls-style-layer="${layerId}"><i class="bi bi-eyedropper"></i> Alternate Styles</button>` : ``}
                                    ${this.isLayerFilterable(layerConfig, l) ? `<button type="button" class="btn btn-outline-primary mt-3 ms-2" id="gifw-active-layers-filter-${layerId}" data-gifw-controls-filter-layer="${layerId}"><i class="bi bi-funnel${this.getLayerFilteredStatus(layerConfig,l) ? "-fill":""}"></i> Filter</button>` : ``}
                                </div>
                            </div>
                        </div>
                    </div>
                `
                accordion.insertAdjacentHTML('beforeend',layerHtml)
            })
            activeLayersContainer.insertAdjacentElement('beforeend', accordion);
            this.setLayerVisibilityState();
            let _this = this;
            Sortable.create(accordion, {
                swapThreshold: 0.70,
                animation: 150,
                filter: '.disabled, input',
                preventOnFilter: false,
                handle: '.handle',
                onChange: function (e) {
                    _this.updateLayerOrderingFromList();
                }
            });
            this.attachStyleControls();
        } else {
            activeLayersContainer.innerHTML = `<div class="alert alert-info">You don't have any layers turned on. Go to the picker to turn some layers on </div>`;
        }

    }

    /**
    * Attaches relevant events to the Layer Control additional controls (including layer search and the buttons)
    *
    * @returns void
    *
    */
    private attachControls(): void {
        let container = document.querySelector(this.container);
        /*SEARCH*/
        this.createOrUpdateFuseInstance();

        let searchInput: HTMLInputElement = container.querySelector('#gifw-layer-switcher-search');
        searchInput.addEventListener('input', (e) => {
            this.filterLayersListByText(searchInput.value.trim());
        });

        /*SORT*/
        let sortSelect: HTMLSelectElement = container.querySelector('#gifw-layer-switcher-sort');
        sortSelect.addEventListener('change', (e) => {
            if (sortSelect.value === 'default') {
                this.listSortOrder = LayerListSortingOption.Default;
            } else {
                this.listSortOrder = LayerListSortingOption.Alphabetical;
            }
            this.renderLayerList();
            this.setLayerVisibilityState();
        })


        /*TURN OFF LAYERS BUTTON*/
        let turnOffAllButton = container.querySelector('#gifw-layers-turn-off');
        
        turnOffAllButton.addEventListener('click', () => {
            this.turnOffAllLayers();
        });    

        /*LEGEND BUTTON*/
        let showLegendButton = container.querySelector('#gifw-layers-view-legend');
        showLegendButton.addEventListener('click', () => {
            this.gifwMapInstance.openSidebarById('legends')
        });

        /*STYLE*/
        this.attachStyleControls();

        /*ADD DATA BUTTON*/
        
        let addDataUploadButton = document.querySelector('#gifw-upload-data-button');
        let addLayerModal = Modal.getOrCreateInstance('#add-layer-modal');
        addDataUploadButton.addEventListener('click', () => {
            addLayerModal.hide();
            let addLayerUploadModal = Modal.getOrCreateInstance('#add-layer-upload-data-modal');
            addLayerUploadModal.show();
        })

        new LayerUpload(
            this.gifwMapInstance,
            document.querySelector('#add-layer-upload-data-modal .dropzone') as HTMLElement,
            document.querySelector('#add-layer-upload-data-modal .dropzone input[type="file"]') as HTMLInputElement,
            () => {
                let addLayerUploadModal = Modal.getOrCreateInstance('#add-layer-upload-data-modal');
                addLayerUploadModal.hide();
            }
        );

        let addWebLayerButton = document.querySelector('#gifw-add-web-layer-button');
        addWebLayerButton.addEventListener('click', () => {
            addLayerModal.hide();
            let addWebLayerModal = Modal.getOrCreateInstance('#add-layer-web-layer-modal');
            addWebLayerModal.show();
        })

    }
    private createOrUpdateFuseInstance():void {
        const options = {
            includeScore: true,
            includeMatches: true,
            threshold: 0.2,
            keys: ['name']
        }
        let allLayers: Layer[] = [];
        let allCategories: Category[] = [];

        this.gifwMapInstance.config.categories.forEach(c => {
            allCategories.push(c);
            allLayers.push(...c.layers);
        });

        this._fuseInstance = new Fuse([...allCategories, ...allLayers], options);
    }

    /**
    * Updates the state of the Layer Control additional controls
    *
    * @returns void
    *
    */
    private updateControlState(): void {
        /*TURN OFF LAYERS BUTTON*/
        let turnOffAllButton = document.querySelector('#gifw-layers-turn-off');
        let anyLayersOn = this.gifwMapInstance.anyOverlaysOn();
        if (anyLayersOn) {
            turnOffAllButton.removeAttribute('disabled');
        } else {
            turnOffAllButton.setAttribute('disabled','');
        }

        /*SHOW LEGEND BUTTON*/
        let showLegendButton = document.querySelector('#gifw-layers-view-legend');
        if (anyLayersOn) {
            showLegendButton.removeAttribute('disabled');
        } else {
            showLegendButton.setAttribute('disabled', '');
        }
    }

    /**
    * Attaches additional layer control event listeners to all layers
    *
    * @returns void
    *
    */
    private attachLayerEventListeners(): void {

        // When the map has fully rendered, check for active layer errors
        this.gifwMapInstance.olMap.on('rendercomplete', () => { this.raiseAlertForErrors() });

        let layerGroups = this.gifwMapInstance.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])

        layerGroups.forEach(lg => {
            let layers = lg.olLayerGroup.getLayersArray();
            layers.forEach(l => {
                this.attachStandardEventListenersToLayer(l);
            });
        })

        this.gifwMapInstance.olMap.on('moveend', e => {
            let roundedZoom = Math.ceil(this.gifwMapInstance.olMap.getView().getZoom());
            if (roundedZoom !== this.previousZoom) {
                this.setLayerVisibilityState();
            }
            this.previousZoom = roundedZoom;
        });
    }

    private attachStandardEventListenersToLayer(l: olLayer<any, any>): void {
        let layerName = l.get('name');

            l.on('change:visible', () => {
                this.updateControlState();
                this.renderActiveLayerList();
                this.setCheckboxState(l);
                setTimeout(() => { this.gifwMapInstance.setLayerSaturation(l,l.get('saturation')) }, 200); //The small timeout is in place to give the DOM a chance to update...
            });

        // Get the layer source and determine the string prefix used for load and error events
        let source = l.getSource();
        let eventPrefix: string;
        if (source instanceof TileSource) {
            eventPrefix = 'tile';
        } else if (source instanceof VectorSource) {
            eventPrefix = 'features'
        } else if (source instanceof ImageSource) {
            eventPrefix = 'image'
        }
        if (eventPrefix) {
            source.on(eventPrefix + 'loadstart', () => {
                if (!(source instanceof VectorSource)) {
                    let checkbox = this.getLayerCheckbox(l);
                    if (checkbox !== null) {
                        let spinner = checkbox.parentElement.querySelector<HTMLDivElement>('.spinner');
                        if (!spinner) {
                            let errorBadge = checkbox.parentElement.querySelector('.badge-error');
                            if (errorBadge) {
                                errorBadge.remove();
                            }
                            spinner = checkbox.parentElement.appendChild(Spinner.Small());
                        }
                        if (!(layerName in this.loadingLayers)) {
                            this.loadingLayers[layerName] = {
                                count: 1
                            };
                        } else {
                            this.loadingLayers[layerName].count += 1;
                            if (this.loadingLayers[layerName].timeout) {
                                clearTimeout(this.loadingLayers[layerName].timeout);
                            }
                        }
                        this.loadingLayers[layerName].timeout = setTimeout(() => {
                            if (!(layerName in this.loadingLayers)) {
                                spinner.remove();
                                if (!checkbox.parentElement.querySelector('.badge-error')) {
                                    checkbox.parentElement.append(Badge.Error());
                                }
                                new Util.Alert(1, Util.AlertSeverity.Danger, 'Layer error', `The layer, ${layerName}, took too long to load. Something may have gone wrong.`, '#gifw-error-toast').show();
                            }
                        }, 30000);
                    }
                }
            });

            source.on(eventPrefix + 'loadend', () => {
                setTimeout(() => {
                    if (layerName in this.loadingLayers) {
                        this.loadingLayers[layerName].count -= 1;
                        if (this.loadingLayers[layerName].count === 0) {
                            if (this.loadingLayers[layerName].timeout) {
                                clearTimeout(this.loadingLayers[layerName].timeout);
                            }
                            delete this.loadingLayers[layerName];
                        }
                    };
                    let checkbox = this.getLayerCheckbox(l);
                    if (checkbox !== null) {
                        let spinner = checkbox.parentElement.querySelector<HTMLDivElement>('.spinner');
                        if (spinner) {
                            if (!(layerName in this.loadingLayers)) {
                                spinner.remove();
                            }
                        }
                    }
                }, 500);
            });

            source.on(eventPrefix + 'loaderror', () => {
                setTimeout(() => {
                    if (layerName in this.loadingLayers) {
                        this.loadingLayers[layerName].count -= 1;
                        if (this.loadingLayers[layerName].count === 0) {
                            if (this.loadingLayers[layerName].timeout) {
                                clearTimeout(this.loadingLayers[layerName].timeout);
                            }
                            delete this.loadingLayers[layerName];
                        }
                    };
                    let checkbox = this.getLayerCheckbox(l);
                    if (checkbox !== null) {
                        let spinner = checkbox.parentElement.querySelector<HTMLDivElement>('.spinner');
                        if (spinner) {
                            if (!(layerName in this.loadingLayers)) {
                                spinner.remove();
                                // If all layers are loaded before this one errored, there won't be another render complete event, and so we trigger a check for errored layers here
                                if (Object.keys(this.loadingLayers).length === 0) {
                                    this.raiseAlertForErrors();
                                }
                            }
                        }
                        if (!checkbox.parentElement.querySelector('.badge-error')) {
                            checkbox.parentElement.append(Badge.Error());
                        }
                    }
                }, 500);
            });
        }
    }

    /**
    * Gets the Layer Control checkbox associated with this layer
    *
    * @param {Layer<any>}  layer - The layer you want to find the checkbox for
    * @returns HTMLInputElement
    *
    */
    private getLayerCheckbox(layer: BaseLayer) {
        let container = document.querySelector(this.container);
        let layerId = layer.get('layerId');
        let layerSwitcherTree = container.querySelector('.layer-switcher-tree');
        return layerSwitcherTree.querySelector<HTMLInputElement>(`input[type='checkbox'][value='${layerId}']`);
    }

    /**
    * Gets the Layer Control list item associated with this layer
    *
    * @param {Layer<any>}  layer - The layer you want to find the checkbox for
    * @returns HTMLInputElement
    *
    */  
    private getLayerListItem(layer: BaseLayer) {
        let cb = this.getLayerCheckbox(layer);
        
        return cb.closest('li');
    }

    /**
    * Gets the Layer Control Active Layer item associated with this layer
    *
    * @param {Layer<any>}  layer - The layer you want to find the active layer item for
    * @returns HTMLElement
    *
    */
    private getActiveLayerItem(layer: olLayer<any, any>) {
        let container = document.querySelector(this.container);
        let layerId = layer.get('layerId');
        let activeLayersList = container.querySelector('.active-layers-list');
        return activeLayersList?.querySelector<HTMLElement>(`li[data-gifw-layer-id='${layerId}']`);
    }

    /**
    * Raises alert dialogs if one or more layers have errored whilst loading
    *
    * @returns void
    *
    */
    private raiseAlertForErrors() {
        let alertingLayers: olLayer<any, any>[] = [];
        let layersWithErrorBadge: olLayer<any, any>[] = [];

        let layerGroups = this.gifwMapInstance.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])

        let layers: olLayer<any, any>[] = [];
        layerGroups.forEach(lg => {
            layers = layers.concat(lg.olLayerGroup.getLayersArray());
        })

        layers.forEach(l => {
            let checkbox = this.getLayerCheckbox(l);
            if (checkbox) {
                let errorBadge = checkbox.parentElement.querySelector('.badge-error');
                // Remove layers from the error list if they no longer have an error badge
                if (errorBadge) {
                    if (checkbox.checked) {
                        layersWithErrorBadge.push(l);
                    } else {
                        errorBadge.remove();
                        this.erroredLayers = this.erroredLayers.filter((item) => item !== l);
                    }
                } else {
                    this.erroredLayers = this.erroredLayers.filter((item) => item !== l);
                }
            }
        });

        // Do not alert for layers that have previously errored and therefore already raised an alert
        layersWithErrorBadge.forEach((l) => {
            if (!(this.erroredLayers.includes(l))) {
                alertingLayers.push(l);
                this.erroredLayers.push(l);
            }
        });

        if (alertingLayers.length == 1) {
            new Util.Alert(1, Util.AlertSeverity.Danger, 'Layer error', `The layer, ${alertingLayers[0].get("name")}, failed to load as expected.`, '#gifw-error-toast').show();
        } else if (alertingLayers.length > 1) {
            new Util.Alert(1, Util.AlertSeverity.Danger, 'Layer error', 'Multiple layers failed to load as expected. Please check the layers panel to see which have errored.', '#gifw-error-toast').show();
        }
        this.setLayerVisibilityState(layers);
    }

    /**
    * Sets various status messages for a layer based on visibility on the map
    *
    * @returns void
    *
    */
    private setLayerVisibilityState(layerArray?: olLayer<any, any>[]) {

        let roundedZoom = Math.ceil(this.gifwMapInstance.olMap.getView().getZoom());

        let layers: olLayer<any, any>[];
        if (layerArray) {
            layers = layerArray;
        } else {
            let layerGroup = this.gifwMapInstance.olMap.getLayers().getArray().filter(g => g.get('type') === 'overlay')[0];
            layers = layerArray || layerGroup.getLayersArray();
        }

        layers.forEach((l) => {
            let checkbox = this.getLayerCheckbox(l);
            if (checkbox) {
                let invisibilityBadge = checkbox.parentElement.querySelector('.badge-invisible');
                if (l.getOpacity() === 0 && !invisibilityBadge) {
                    checkbox.parentElement.append(Badge.Invisible());
                } else if (l.getOpacity() > 0 && invisibilityBadge) {
                    invisibilityBadge.remove();
                }
            

                checkbox.parentElement.removeAttribute('title');
                Tooltip.getInstance(checkbox.parentElement)?.dispose();
                let outOfRangeBadge = checkbox.parentElement.querySelector('.badge-out-of-range');
                if (outOfRangeBadge) {
                    outOfRangeBadge.remove();
                }
            }
            let activeLayerItem = this.getActiveLayerItem(l);
            if (activeLayerItem) {
                let alOutOfRangeBadge = activeLayerItem.querySelector('.badge-out-of-range');
                if (alOutOfRangeBadge) {
                    alOutOfRangeBadge.remove();
                }
            }
        });

        //Update state of checkboxes. Fire warning messages for layers that are now out of range
        let overzoomedLayers = layers.filter(l => l.getMaxZoom() < roundedZoom);
        let underzoomedLayers = layers.filter(l => l.getMinZoom() >= roundedZoom);
            
        overzoomedLayers.forEach(l => this.setLayerOutOfRange(l, roundedZoom));
        underzoomedLayers.forEach(l => this.setLayerOutOfRange(l, roundedZoom));

        let outOfRangeLayers = overzoomedLayers.concat(underzoomedLayers);

        outOfRangeLayers.forEach((l) => {
            let checkbox = this.getLayerCheckbox(l);
            if (checkbox !== null) {
                if (!checkbox.parentElement.querySelector('.badge-out-of-range')) {
                    checkbox.parentElement.append(Badge.OutOfRange());
                }
            }
            let activeLayerItem = this.getActiveLayerItem(l);
            if (activeLayerItem) {
                if (!activeLayerItem.querySelector('.badge-out-of-range')) {
                    activeLayerItem.insertAdjacentElement('beforeend',Badge.OutOfRange());
                }
            }
        });

        overzoomedLayers = overzoomedLayers.filter(l => l.getMaxZoom() >= (this.previousZoom ?? 0))
        underzoomedLayers = underzoomedLayers.filter(l => l.getMinZoom() < (this.previousZoom ?? 0))

        let newlyOutOfRangeLayers = overzoomedLayers.concat(underzoomedLayers);

        let activeOutOfRangeLayers = newlyOutOfRangeLayers.filter(l => l.getVisible());

        if (activeOutOfRangeLayers.length > 0) {
            let notificationText = `${activeOutOfRangeLayers.length} layers are out of range and have been hidden`;
            if (activeOutOfRangeLayers.length === 1) {
                let layerGroup = this.gifwMapInstance.getLayerGroupOfType(LayerGroupType.Overlay);
                let layerDetails = (layerGroup.layers as Layer[]).filter(l => l.id == activeOutOfRangeLayers[0].get("layerId"));
                if (layerDetails.length === 1) {
                    notificationText = `'${layerDetails[0].name}' is out of range and has been hidden`;
                }
            }

            let visibilityNotification = new Util.Alert(1, Util.AlertSeverity.Info, 'Layer visibility', notificationText, '#gifw-layer-range-toast');
            /*NOTE: This is the only way I could get the progress bar to reset consistently on show of toast*/
            /*Main issue was when toast is hidden automatically due to 'atomic' setting, no events are fired*/
            (document.querySelector('#gifw-layer-range-toast .progress-bar') as HTMLElement).style.transition = 'none';
            (document.querySelector('#gifw-layer-range-toast .progress-bar') as HTMLElement).style.width = '0%';
            visibilityNotification.show();
            (document.querySelector('#gifw-layer-range-toast .progress-bar') as HTMLElement).style.transition = 'width 4s linear';
            (document.querySelector('#gifw-layer-range-toast .progress-bar') as HTMLElement).style.width = '100%';
            
            
        }
    }

    /**
    * Shows a layer as out of range in the layers list and adds tooltip to item
    *
    * @param {Layer<any>} layer - The layer we want to set the out of range message for
    * @param {number} newZoom - The zoom level that the map is at
    * @returns void
    *
    */
    private setLayerOutOfRange(layer: olLayer<any, any>, newZoom:number) {
        let layerId = layer.get('layerId');

        let layerCheckboxLabelContainer: HTMLElement = document.querySelector(`#layer-switcher-${layerId}`)?.parentElement;
        if (layerCheckboxLabelContainer) {
            layerCheckboxLabelContainer.setAttribute('title', `This layer is out of range. Zoom ${newZoom > layer.getMaxZoom() ? 'out' : 'in'} to view.`)

            Tooltip.getOrCreateInstance(layerCheckboxLabelContainer);
        }
    }

    /**
    * Sets the state of a layers checkbox to its current visibility state
    *
    * @param {Layer<any>} layer - The layer we want to set the checkbox state for
    * @returns void
    *
    */
    private setCheckboxState(layer: olLayer<any, any>) {
        let cb = this.getLayerCheckbox(layer);
        cb.checked = layer.getVisible();
    }

    /*TODO - Make this generic*/
    /**
    * Attaches event to close button to the panel
    *
    * @returns void
    *
    */
    private attachCloseButton(): void {
        let container = document.querySelector(this.container);
        let closeButton = container.querySelector('button[data-gifw-dismiss-sidebar]');
        if (closeButton !== null) {
            closeButton.addEventListener('click', (e) => {
                Sidebar.close();
            });
        }
    };

    /**
    * Switches off all overlays on the map
    *
    * @returns void
    *
    */
    private turnOffAllLayers(): void {
        let layerGroups = this.gifwMapInstance.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])
        let layers: olLayer<any, any>[] = [];
        layerGroups.forEach(lg => {
            layers = layers.concat(lg.olLayerGroup.getLayersArray());
        })

        layers.forEach(l => {
            l.setVisible(false);
        });

    }

    /**
    * Filter the layer list by a search term using fusejs
    *
    * @param {string} text - The search term to filter the list by
    * @returns void
    *
    */
    /*TODO: The code to show/hide layers and folders is all a bit messy and requires targeting specific elements. 
     *This could all do with improvement in a future iteration*/
    private filterLayersListByText(text: string) {
        let container = document.querySelector(this.container);
        let errMsg: HTMLElement = document.querySelector('#gifw-layer-search-error');
        if (text.trim().length === 0) {
            //show all layers and clear error
            errMsg.style.display = 'none';
            this.showAllLayersInList();
        } else {
            let results = this._fuseInstance.search(text,);
            if (results.length === 0) {
                //show all layers along with error
                errMsg.innerText = `No results found for '${text}'`;
                errMsg.style.display = 'block';
                this.showAllLayersInList();
            } else {
                errMsg.style.display = 'none';
                //hide everything!
                let layersListContainer = container.querySelector('.layer-switcher-tree');
                let layerSwitcherCheckboxes: NodeListOf<HTMLInputElement> = layersListContainer.querySelectorAll('input[type=checkbox]');
                layerSwitcherCheckboxes.forEach(c => {
                    c.closest('li').style.display = 'none';
                    let parentFolders = Util.Helper.getAllParentElements(c as HTMLElement, '.accordion-collapse');
                    parentFolders.forEach(pf => {
                        pf.classList.remove('show');
                        pf.parentElement.classList.add('border-0');
                        container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`).setAttribute('aria-expanded', 'false');
                        container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`).classList.add('collapsed');
                        (container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`) as HTMLElement).style.display = 'none';
                    })
                });


                let layerResults = results.filter(r => r.item.layers === undefined);
                let folderResults = results.filter(r => r.item.layers !== undefined);

                //go through all folders that have a result and make sure all the parent folders, child folders and layer checkboxes are visible
                folderResults.forEach(folderResult => {
                    let layerFolder: HTMLDivElement = document.querySelector(`#category-${folderResult.item.id}`);
                    layerFolder.parentElement.classList.remove('border-0');
                    (container.querySelector(`.accordion-button[aria-controls="category-${folderResult.item.id}"]`) as HTMLElement).style.display = 'flex';
                    let allCheckboxes: HTMLInputElement[] = [];

                    allCheckboxes.push(...(layerFolder.querySelectorAll('input[type=checkbox]') as NodeListOf<HTMLInputElement>));
                    let parentFolders = Util.Helper.getAllParentElements(layerFolder as HTMLElement, '.accordion-collapse');
                    parentFolders.forEach(pf => {
                        pf.classList.add('show');
                        pf.parentElement.classList.remove('border-0');
                        container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`).setAttribute('aria-expanded', 'true');
                        container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`).classList.remove('collapsed');
                        (container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`) as HTMLElement).style.display = 'flex';
                        allCheckboxes.push(...(pf.querySelectorAll('input[type=checkbox]') as NodeListOf<HTMLInputElement>));
                    })
                    let childFolders = layerFolder.querySelectorAll('.accordion-collapse');
                    childFolders.forEach(cf => {
                        cf.parentElement.classList.remove('border-0');
                        (container.querySelector(`.accordion-button[aria-controls="${cf.id}"]`) as HTMLElement).style.display = 'flex';
                        allCheckboxes.push(...(cf.querySelectorAll('input[type=checkbox]') as NodeListOf<HTMLInputElement>));
                    })
                    allCheckboxes.forEach(c => {
                        c.closest('li').style.display = 'block';
                    })
                })

                //go through individual layer results and make their checkbox visible and make sure their parent folders are visible and open
                layerResults.forEach(layerResult => {
                    //this is a layer
                    let layerCheckbox: HTMLInputElement = document.querySelector(`#layer-switcher-${layerResult.item.id}`);
                    layerCheckbox.closest('li').style.display = 'block';
                    let parentFolders = Util.Helper.getAllParentElements(layerCheckbox as HTMLElement, '.accordion-collapse');
                    parentFolders.forEach(pf => {
                        pf.classList.add('show');
                        pf.parentElement.classList.remove('border-0');
                        container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`).setAttribute('aria-expanded', 'true');
                        container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`).classList.remove('collapsed');
                        (container.querySelector(`.accordion-button[aria-controls="${pf.id}"]`) as HTMLElement).style.display = 'flex';
                    })
                })

            }
        }
    }

    /**
    * Resets the layer control list to show everything
    *
    * @returns void
    *
    */
    private showAllLayersInList(): void {
        let container = document.querySelector(this.container);
        let layersListContainer = container.querySelector('.layer-switcher-tree');
        let layerSwitcherCheckboxes: NodeListOf<HTMLInputElement> = layersListContainer.querySelectorAll('input[type=checkbox]');
        let layerSwitcherButtons = container.querySelectorAll('.accordion-button');
        layerSwitcherCheckboxes.forEach(c => {
            Util.Helper.getAllParentElements(c, '.accordion-item').forEach(ai => {
                ai.classList.remove('border-0');
            })
            c.closest('li').style.display = 'block';
        });
        layerSwitcherButtons.forEach(b => {
            (b as HTMLElement).style.display = 'flex';
            b.setAttribute('aria-expanded', 'false');
        })
    }

    /**
    * Update z-indexes of layers on map using sortable list
    *
    * @returns void
    *
    */
    private updateLayerOrderingFromList(): void {
        let container = document.querySelector(this.container);
        let activeLayersContainer = container.querySelector('#gifw-layer-control-active-layers');

        let layerListItems = activeLayersContainer.querySelectorAll('.active-layers-list [data-gifw-layer-id]');
        /*NOTE: As the default z-index for a layer is 0, we set this to -1 to allow newly added, unsorted layers
         * to take immediate precedence. This is far from perfect*/
        let ordering = -1;

        let layerGroups = this.gifwMapInstance.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])
        let layers: olLayer<any, any>[] = [];

        layerGroups.forEach(lg => {
            layers = layers.concat(lg.olLayerGroup.getLayersArray());
        })


        layerListItems.forEach(item => {
            let layerId = (item as HTMLElement).dataset.gifwLayerId;
            let layer = layers.filter(l => l.get('layerId') == layerId);
            if (layer && layer.length === 1) {
                //set the z-index
                layer[0].setZIndex(ordering);
                ordering--;
            }
        })
        document.getElementById(this.gifwMapInstance.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));

    }
    /**
     * Remove a layer from the list
     *
     * @param layer{BaseLayer} - The OpenLayers layer which we want to remove from the list
     *
     * @returns void
     */
    private removeLayerFromList(layer: BaseLayer) {
        //remove the checkbox
        let listItem = this.getLayerListItem(layer);
        listItem.remove();
    }
    /**
    * Set the map instance this panel is linked to
    *
    * @returns void
    *
    */
    public setGIFWMapInstance(map: GIFWMap) {
        this.gifwMapInstance = map;
    }

    /**
    * Attach opacity and saturation controls to the panel
    *
    * @returns void
    *
    */
    private attachStyleControls() {
        let container = document.querySelector(this.container);

        //attach transparency slider
        let transparencySliders: NodeListOf<HTMLInputElement> = container.querySelectorAll('input[data-gifw-controls-transparency-layer]');
        transparencySliders.forEach(transparencySlider => {

            transparencySlider.addEventListener('input', e => {
                let element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);
                let opacity = parseInt(element.value);
                let layerId = element.dataset.gifwControlsTransparencyLayer;
                let linkedInvisibleCheckbox: HTMLInputElement = container.querySelector(`input[data-gifw-controls-invisible-layer="${layerId}"]`);
                if (opacity === 0) {
                    linkedInvisibleCheckbox.checked = true;
                } else {
                    linkedInvisibleCheckbox.checked = false;
                }
                let layer = this.gifwMapInstance.getLayerById(layerId);
                if (layer) {
                    this.gifwMapInstance.setLayerOpacity(layer as olLayer<any, any>, opacity);
                }
            });
        });
        //attach saturation slider
        let saturationSliders: NodeListOf<HTMLInputElement> = container.querySelectorAll('input[data-gifw-controls-saturation-layer]');
        saturationSliders.forEach(saturationSlider => {
            saturationSlider.addEventListener('input', e => {
                let element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);
                let saturation = parseInt(element.value);
                let layerId = element.dataset.gifwControlsSaturationLayer;
                let linkedGreyscaleCheckbox: HTMLInputElement = container.querySelector(`input[data-gifw-controls-greyscale-layer="${layerId}"]`);
                if (saturation === 0) {
                    linkedGreyscaleCheckbox.checked = true;
                } else {
                    linkedGreyscaleCheckbox.checked = false;
                }
                let layer = this.gifwMapInstance.getLayerById(layerId);
                if (layer) {
                    this.gifwMapInstance.setLayerSaturation(layer as olLayer<any, any>, saturation);
                }
            });
        });
        //attach invisible button
        let invisibleButtons: NodeListOf<HTMLInputElement> = container.querySelectorAll('input[data-gifw-controls-invisible-layer]');
        invisibleButtons.forEach(invisibleButton => {
            invisibleButton.addEventListener('change', e => {
                let element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

                let layerId = element.dataset.gifwControlsInvisibleLayer;
                let linkedTransparencySlider: HTMLInputElement = container.querySelector(`input[data-gifw-controls-transparency-layer="${layerId}"]`);
                if (element.checked) {
                    linkedTransparencySlider.value = "0";
                } else {
                    linkedTransparencySlider.value = "100";
                }
                let evt = new InputEvent('input');
                linkedTransparencySlider.dispatchEvent(evt);
            });
        });
        //attach greyscale button
        let greyscaleButtons: NodeListOf<HTMLInputElement> = container.querySelectorAll('input[data-gifw-controls-greyscale-layer]');
        greyscaleButtons.forEach(greyscaleButton => {
            greyscaleButton.addEventListener('change', e => {
                let element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

                let layerId = element.dataset.gifwControlsGreyscaleLayer;
                let linkedSaturationSlider: HTMLInputElement = container.querySelector(`input[data-gifw-controls-saturation-layer="${layerId}"]`);
                if (element.checked) {
                    linkedSaturationSlider.value = "0";
                } else {
                    linkedSaturationSlider.value = "100";
                }
                let evt = new InputEvent('input');
                linkedSaturationSlider.dispatchEvent(evt);
            });
        });

        let alternateStyleButtons: NodeListOf<HTMLInputElement> = container.querySelectorAll('button[data-gifw-controls-style-layer]');
        alternateStyleButtons.forEach(alternateStyleButton => {
            alternateStyleButton.addEventListener('click', e => {
                let element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

                let layerId = element.dataset.gifwControlsStyleLayer;

                let layer = this.gifwMapInstance.getLayerById(layerId);
                this.showAlternateStyleModal(layer);
                e.preventDefault();
            });
        });

        let filterButtons: NodeListOf<HTMLInputElement> = container.querySelectorAll('button[data-gifw-controls-filter-layer]');
        filterButtons.forEach(filterButton => {
            filterButton.addEventListener('click', e => {
                let element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

                let layerId = element.dataset.gifwControlsFilterLayer;

                let layer = this.gifwMapInstance.getLayerConfigById(layerId,[LayerGroupType.Overlay]);
                e.preventDefault();
                let layerFilter = new LayerFilter(this, layer);
                layerFilter.showFilterDialog();
                e.preventDefault();
            });
        });

    }

    /**
    * Shows the modal with the list of alternate styles available from the source server
    *
    * @param layer{BaseLayer} The OpenLayers layer which we want to show the list for
    * @returns void
    *
    */
    private showAlternateStyleModal(layer:BaseLayer) {
        let styleModal = new Modal(document.getElementById('layer-update-style-modal'), {});
        let styleModalContent: HTMLElement = document.querySelector('#layer-update-style-modal .modal-body div');
        if (layer instanceof TileLayer || layer instanceof ImageLayer) {
            let layerSource = layer.getSource();
            if (layerSource instanceof TileWMS || layerSource instanceof ImageWMS) {
                let descriptionHTML: string = `<h5 class="card-title placeholder-glow">
                                                <span class="placeholder col-6"></span>
                                            </h5>
                                            <p class="card-text placeholder-glow">
                                                <span class="placeholder col-7"></span>
                                                <span class="placeholder col-4"></span>
                                                <span class="placeholder col-4"></span>
                                                <span class="placeholder col-6"></span>
                                                <span class="placeholder col-8"></span>
                                            </p>`;

                styleModalContent.innerHTML = descriptionHTML;
                styleModal.show();

                let sourceParams = layerSource.getParams();
                let featureTypeName = sourceParams.LAYERS;
                let baseUrl: string;
                if (layerSource instanceof TileWMS) {
                    baseUrl = layerSource.getUrls()[0];
                } else {
                    baseUrl = layerSource.getUrl();
                }

                let authKey = Util.Helper.getValueFromObjectByKey(sourceParams, "authkey");
                let additionalParams = {};
                if (authKey) {
                    additionalParams = { authkey: authKey };
                }

                let proxyEndpoint = "";
                let layerId = layer.get("layerId");
                let gifwLayer = this.gifwMapInstance.getLayerConfigById(layerId, [LayerGroupType.Overlay]);
                if (gifwLayer.proxyMetaRequests) {
                    proxyEndpoint = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}proxy`;
                }
                let styleListPromise = Metadata.getStylesForLayer(baseUrl, featureTypeName, proxyEndpoint, additionalParams);
                if (styleListPromise) {
                    styleListPromise.then(styles => {
                        styleModalContent.innerHTML = '';
                        styleModalContent.appendChild(this.renderStylesList(styles, layerSource));

                    }).catch(e => {
                        console.error(e);
                        styleModalContent.innerHTML = `<div class="alert alert-warning">There was a problem getting the styles list from the server.</div><code>${e}</code>`

                    });
                    return;
                }
            }
        }
        styleModalContent.innerHTML = `<div class="alert alert-info">There are no additional styles available for this layer</div>`;
        return;
    }

   /**
   * Creates the HTML for the list of alternate styles available from the source server
   *
   * @param styles{Style[]} An array of Styles that we want to render to the list
   * @param layerSource{ImageWMS|TileWMS} The layer source of the layer we are styling
   * @returns HTMLElement
   *
   */
    private renderStylesList(styles: Style[], layerSource:ImageWMS|TileWMS): HTMLElement {
        let stylesHtml: HTMLElement;
        if (styles?.length > 1) {
            stylesHtml = document.createElement('div');
            stylesHtml.className = 'list-group';
            let currentStyleName = layerSource.getParams()?.STYLES || "";
            let defaultStyle: Style = {
                name: "",
                title: "Default",
                abstract: "The default style for this layer"
            }
            
            stylesHtml.appendChild(this.renderStyleItem(defaultStyle, layerSource, currentStyleName === "" ? true : false));
            styles.forEach(style => {
                stylesHtml.appendChild(this.renderStyleItem(style, layerSource, currentStyleName === style.name ? true : false));
            })
        } else {
            stylesHtml = document.createElement('div')
            stylesHtml.className = "alert alert-info"
            stylesHtml.innerText = 'There are no additional styles available for this layer';
        }
        return stylesHtml;
    }

    /**
    * Creates the HTML for a single style available from the source server
    *
    * @param style{Style} The style we want to render
    * @param layerSource{ImageWMS|TileWMS} The layer source of the layer we are styling
    * @param isActive{boolean?} Flag indicating if this style is currently applied to the layer. Defaults to false
    * @returns HTMLElement
    *
    */
    private renderStyleItem(style: Style, layerSource: ImageWMS | TileWMS, isActive: boolean = false): HTMLElement {
        let styleLinkContainer = document.createElement('a');
        styleLinkContainer.className = `list-group-item list-group-item-action ${isActive ? 'active' : ''}`;
        styleLinkContainer.href = '#';
        styleLinkContainer.dataset.gifwLayerStyleName = style.name;
        styleLinkContainer.innerHTML = `<h5 class="mb-2">${style.title}</h5>`;
        styleLinkContainer.innerHTML += `<p class="mb-1">${style.abstract ? style.abstract : 'No description provided'}</p>`

        styleLinkContainer.addEventListener('click', e => {
            let selectedStyleName = (e.currentTarget as HTMLElement).dataset.gifwLayerStyleName;
            this.setLayerStyle(layerSource, selectedStyleName);
            let styleModal = Modal.getInstance('#layer-update-style-modal');

            styleModal.hide();
            e.preventDefault();
        })

        return styleLinkContainer;
    }

    /**
     * Sets the style of the layer
     * @param layerSource The layer source we are updating
     * @param styleName The name of the style we are applying
     */
    private setLayerStyle(layerSource: ImageWMS | TileWMS, styleName: string) {
        layerSource.updateParams({ STYLES: styleName });
        //TODO - Replace these with 'change' events on the source/layer itself?
        document.getElementById(this.gifwMapInstance.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
    }

    /**
     * Returns a boolean indicating if the layer is filterable
     * @param layer The layer configuration information
     * @param olLayer The OpenLayers layer
     * @return Boolean indicating if the layer is filterable
     * */
    public isLayerFilterable(layer: Layer, olLayer: olLayer): boolean {
        return (layer.filterable && (olLayer.getSource() instanceof TileWMS || olLayer.getSource() instanceof ImageWMS));
    }

    /**
     * Updates the filter icon in the layers panel for a specified layer
     * @param layerId The ID of the layer to check
     */
    public updateLayerFilteredStatusIcon(layerId: string): void {
        let layersListFilterButton = document.getElementById(`gifw-filter-layer-${layerId}`);
        let activeLayersFilterButton = document.getElementById(`gifw-active-layers-filter-${layerId}`);
        let olLayer = this.gifwMapInstance.getLayerById(layerId);
        let layer = this.gifwMapInstance.getLayerConfigById(layerId, [LayerGroupType.Overlay]);
        if (olLayer && layer) {
            let icon = `bi-funnel${this.getLayerFilteredStatus(layer, (olLayer as olLayer)) ? "-fill" : ""}`;
            if (layersListFilterButton) {
                layersListFilterButton.querySelector('.bi').className = `bi ${icon}`;
            }
            if (activeLayersFilterButton) {
                activeLayersFilterButton.querySelector('.bi').className = `bi ${icon}`;
            }
        }

    }

    /**
     * Returns a boolean indicating if the layer has a user editable filter applied to it
     * A 'user editable' filter is one they have either applied themselves, or a default one
     * (applied by admins) that the user is allowed to modify
     * @param layer The layer configuration information
     * @param olLayer The OpenLayers layer
     * @return Boolean indicating if it does have a user editable filter applied
     */
    public getLayerFilteredStatus(layer: Layer, olLayer: olLayer, userEditableOnly: boolean = true): boolean {
        if (olLayer.get('gifw-filter-applied')) {
            return true;
        }

        let source = olLayer.getSource();
        let params = (source as TileWMS | ImageWMS).getParams();
        let cqlFilter: string;
        for (const property in params) {
            if (property.toLowerCase() === 'cql_filter') {
                cqlFilter = params[property];
            }
        }

        if (cqlFilter) {
            if (userEditableOnly) {
                return layer.defaultFilterEditable;
            } else {
                return true;
            }
        }
        return false;
    }
}