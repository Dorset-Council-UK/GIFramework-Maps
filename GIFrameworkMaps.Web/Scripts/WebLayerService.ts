import { Modal } from "bootstrap";
import Fuse from "fuse.js";
import { containsExtent } from "ol/extent";
import { transformExtent } from "ol/proj";
import * as olSource from "ol/source";
import { Options as ImageWMSOptions } from "ol/source/ImageWMS";
import { Options as TileWMSOptions } from "ol/source/TileWMS";
import { LayerResource } from "./Interfaces/OGCMetadata/LayerResource";
import { WebLayerServiceDefinition } from "./Interfaces/WebLayerServiceDefinition";
import { GIFWMap } from "./Map";
import { Metadata } from "./Metadata/Metadata";
import Spinner from "./Spinner";
import { Util } from "./Util";


export class WebLayerService {
    gifwMapInstance: GIFWMap;
    serviceDefinitions: WebLayerServiceDefinition[];
    _fuseInstance: Fuse<any>;
    constructor(gifwMapInstance: GIFWMap) {
        this.gifwMapInstance = gifwMapInstance;
    }

    public init() {
        let modalEle = document.getElementById('add-layer-web-layer-modal');

        modalEle.addEventListener('shown.bs.modal', async e => {

            if (!this.serviceDefinitions) {
                try {
                    //get services
                    let serviceDefsURL = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/WebLayerServiceDefinitions`;
                    let response = await fetch(serviceDefsURL);
                    if (!response.ok) {
                        throw new Error(`HTTP error: ${response.status}`);
                    }
                    this.serviceDefinitions = await response.json();
                    this.updateServicesList();
                    document.getElementById('add-layer-web-layer-services-loading').style.display = 'none';
                    document.getElementById('add-layer-web-layer-services-container').style.display = 'block';
                } catch (e) {
                    console.error('Services could not be loaded', e);
                    let modalInstance = Modal.getInstance('#add-layer-web-layer-modal');
                    modalInstance.hide();
                    Util.Alert.showPopupError("An error occurred", "The list of services could not be loaded right now. Please try again later.");
                }
            }

            

        });
        

        //attach UI controls
        let connectBtn = (document.getElementById('gifw-connect-ogc-service') as HTMLButtonElement);
        connectBtn.addEventListener('click', async e => {
            connectBtn.disabled = true;
            connectBtn.insertAdjacentElement('afterbegin', Spinner.create(['spinner-border-sm','me-2']));
            
            let serviceId = (document.querySelector('select[name="ogc-server-name"]') as HTMLSelectElement).selectedOptions[0].value;

            let serviceDefinition = this.serviceDefinitions.filter(s => s.id === parseInt(serviceId))[0]

            let version = serviceDefinition.version || "1.1.0";
            let proxyMetaRequests = serviceDefinition.proxyMetaRequests;
            let proxyEndpoint = "";
            if (proxyMetaRequests) {
                proxyEndpoint = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}proxy`;
            }
            let availableLayers = await Metadata.getLayersFromCapabilities(serviceDefinition.url, version, proxyEndpoint);
            let layersListContainer = document.getElementById('gifw-add-web-layer-list');
            const searchInput: HTMLInputElement = document.getElementById('add-layer-web-layer-search') as HTMLInputElement;
            const errMsg = document.getElementById('add-layer-web-layer-search-error');
            layersListContainer.innerHTML = '';
            if (availableLayers && availableLayers.length !== 0) {
                availableLayers.forEach(layer => {
                    layersListContainer.appendChild(this.renderLayerItem(layer, serviceDefinition));
                })

                searchInput.style.display = '';
                searchInput.value = '';
                this.createOrUpdateFuseInstance(availableLayers);
            } else {
                layersListContainer.innerHTML = '<div class="alert alert-warning">No layers could be retrieved from the service. You may need to be logged in to the service to see layers, or the service is not adveritsing any layers at the moment.</div>';
                document.getElementById('add-layer-web-layer-search').style.display = 'none';
            }
            errMsg.style.display = 'none';
            connectBtn.removeChild(connectBtn.firstChild);
            connectBtn.disabled = false;
        })

        let searchInput: HTMLInputElement = document.getElementById('add-layer-web-layer-search') as HTMLInputElement;
        searchInput.addEventListener('input', (e) => {
            this.filterLayersListByText(searchInput.value.trim());
        });

    }
    private updateServicesList() {
        let selectEle:HTMLSelectElement = document.querySelector('select[name="ogc-server-name"]');
        selectEle.innerHTML = '';
        this.serviceDefinitions.sort((a, b) => a.sortOrder - b.sortOrder);
        let groupedDefs = Util.Helper.groupBy(this.serviceDefinitions, defs => defs.category);
        for (const group of groupedDefs) {
            let optGroup = document.createElement('optgroup');
            optGroup.label = group[0] || 'Other';
            group[1].forEach(definition => {
                let opt = document.createElement('option');
                opt.value = definition.id.toString();
                opt.text = definition.name;
                optGroup.appendChild(opt);
            })
            selectEle.appendChild(optGroup);
        }
        
    }

    /**
    * Creates the HTML for a single layer available from the source server
    *
    * @param layerDetails{CSWMetadata} The layer we want to render
    * @returns HTMLElement
    *
    */
    private renderLayerItem(layerDetails: LayerResource, serviceDefinition: WebLayerServiceDefinition): HTMLElement {
        let layerItemContainer = document.createElement('div');
        layerItemContainer.className = `list-group-item`;
        layerItemContainer.id = layerDetails.name;
        layerItemContainer.innerHTML = `<h5 class="mb-2 text-break">${layerDetails.title}</h5>`;
        layerItemContainer.innerHTML += `<p class="mb-1">${layerDetails.abstract ? layerDetails.abstract : 'No description provided'}</p>`
        let addLayerButton = document.createElement('button');
        addLayerButton.innerHTML = `<i class="bi bi-plus-circle"></i> Add to map`;
        addLayerButton.className = "btn btn-sm btn-outline-primary";
        layerItemContainer.appendChild(addLayerButton);
        addLayerButton.addEventListener('click', e => {
            try {
                let source: olSource.ImageWMS | olSource.TileWMS;

                if (serviceDefinition.proxyMapRequests) {
                    let imageWMSOpts: ImageWMSOptions = {
                        url: layerDetails.baseUrl,
                        params: {
                            "LAYERS": layerDetails.name,
                            "FORMAT": layerDetails.formats[0],
                            "TILED": "false"
                        },
                        attributions: layerDetails.attribution,
                        crossOrigin: 'anonymous',
                        projection: layerDetails.projection,
                
                    };
                    if (serviceDefinition.proxyMapRequests) {
                        imageWMSOpts.imageLoadFunction = (imageTile: any, src: string) => {
                            let proxyUrl = this.gifwMapInstance.createProxyURL(src);
                            imageTile.getImage().src = proxyUrl;
                        };
                    }

                    source = new olSource.ImageWMS(imageWMSOpts);
                } else {
                    let tileWMSOpts: TileWMSOptions = {
                        url: layerDetails.baseUrl,
                        params: {
                            "LAYERS": layerDetails.name,
                            "FORMAT": layerDetails.formats[0],
                            "TILED": "true"
                        },
                        attributions: layerDetails.attribution,
                        crossOrigin: 'anonymous',
                        projection: layerDetails.projection,

                    };
                    if (serviceDefinition.proxyMapRequests) {
                        tileWMSOpts.tileLoadFunction = (imageTile: any, src: string) => {
                            let proxyUrl = this.gifwMapInstance.createProxyURL(src);
                            imageTile.getImage().src = proxyUrl;
                        };
                    }

                    source = new olSource.TileWMS(tileWMSOpts);
                }

                this.gifwMapInstance.addWebLayerToMap(
                    source,
                    layerDetails.title,
                    serviceDefinition.proxyMetaRequests,
                    serviceDefinition.proxyMapRequests
                )
                let layerModal = Modal.getInstance('#add-layer-web-layer-modal');

                layerModal.hide();

                let completeToast = new Util.Alert(Util.AlertType.Toast,
                    Util.AlertSeverity.Info,
                    `👍 Layer added`,
                    `The layer '${layerDetails.title}' has been added to the map. You can find it in the 'My Layers' folder in the layer control. ${layerDetails.extent !== undefined ? '<a href="#" data-gifw-zoom-to-extent>Zoom to extent of layer</a>' : ''}`,
                    '#gifw-error-toast');
                completeToast.show();
                if (layerDetails.extent) {
                    let zoomToLink = completeToast.errorElement.querySelector('a[data-gifw-zoom-to-extent]');

                    zoomToLink.addEventListener('click', e => {
                        e.preventDefault();
                        let reprojectedExtent = transformExtent(layerDetails.extent, 'EPSG:4326', this.gifwMapInstance.olMap.getView().getProjection());
                        let curExtent = this.gifwMapInstance.olMap.getView().calculateExtent();
                        if (this.gifwMapInstance.isExtentAvailableInCurrentMap(reprojectedExtent)) {
                            if (!Util.Browser.PrefersReducedMotion() && containsExtent(curExtent, reprojectedExtent)) {
                                this.gifwMapInstance.olMap.getView().fit(reprojectedExtent, { padding: [50, 50, 50, 50], duration: 1000 });
                            } else {
                                this.gifwMapInstance.olMap.getView().fit(reprojectedExtent, { padding: [50, 50, 50, 50] });
                            }
                            completeToast.hide();
                        } else {
                            let errDialog = new Util.Error
                                (
                                    Util.AlertType.Popup,
                                    Util.AlertSeverity.Danger,
                                    "Layer is outside bounds of map",
                                    `<p>The layer you added extends outside the current max bounds of your background map.</p><p>We've added the layer to the map, but you may need to choose a different background map to see it.</p>`
                                )
                            errDialog.show();
                        }

                    });
                }

            } catch (e) {
                console.error(e);
                Util.Alert.showPopupError('Layer could not be added', `The layer '${layerDetails.title}' could not be added to the map due to an error. It may be broken at source or an error our end. Try another layer or try again later.`)

            }
            e.preventDefault();
        })

        return layerItemContainer;
    }

    private filterLayersListByText(text: string) {
        const allItems = document.querySelectorAll('#gifw-add-web-layer-list .list-group-item');
        const errMsg = document.getElementById('add-layer-web-layer-search-error');
        if (text.trim().length === 0) {
            //show all layers and clear error
            errMsg.style.display = 'none';
            allItems.forEach(layer => {
                (layer as HTMLDivElement).style.display = '';
            })
        } else {

            let results = this._fuseInstance.search(text);
            if (results.length === 0) {
                //no results. show all with error
                allItems.forEach(layer => {
                    (layer as HTMLDivElement).style.display = '';
                })
                errMsg.innerText = `No results found for '${text}'`;
                errMsg.style.display = '';
            } else {
                errMsg.style.display = 'none';
                let matchingLayers = results.map(r => (r.item as LayerResource).name);
                allItems.forEach(layer => {
                    if (matchingLayers.includes(layer.id)) {
                        (layer as HTMLDivElement).style.display = '';
                    } else {
                        (layer as HTMLDivElement).style.display = 'none';
                    }
                })

            }
        }
    }

    private createOrUpdateFuseInstance(layers: LayerResource[]): void {
        const options = {
            includeScore: true,
            includeMatches: true,
            threshold: 0.2,
            keys: ['title','abstract']
        }

        this._fuseInstance = new Fuse(layers, options);
    }

}


