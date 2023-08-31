import Fuse from "fuse.js";
import { LayerResource } from "../Interfaces/OGCMetadata/LayerResource";
import { Metadata } from "../Metadata/Metadata";

export class SelectWebService {
    _fuseInstance: Fuse<any>;

    constructor() {

    }

    public init() {
        //hook up connect buttons
        const listConnectBtn = document.getElementById('web-service-list-connect');
        const urlConnectBtn = document.getElementById('web-service-text-connect');

        listConnectBtn.addEventListener('click', (e) => {
            //get selected value
            const webServiceList = document.getElementById('service-select');
            const url = (webServiceList as HTMLSelectElement).selectedOptions[0].value;
            let version = (webServiceList as HTMLSelectElement).selectedOptions[0].dataset.wmsVersion || "1.1.0";
            let proxyEndpoint = (webServiceList as HTMLSelectElement).selectedOptions[0].dataset.proxyVia;
            this.renderLayersListFromService(url, version, proxyEndpoint);
        })

        urlConnectBtn.addEventListener('click', (e) => {
            //parse URL and fetch
            const webServiceInput = document.getElementById('service-url') as HTMLInputElement;
            const webServiceUseProxy = document.getElementById('use-proxy') as HTMLInputElement;
            const url = webServiceInput.value;

            this.renderLayersListFromService(url, undefined, (webServiceUseProxy.checked ? webServiceUseProxy.value : ""));
        })

        const searchInput: HTMLInputElement = document.getElementById('layer-list-search') as HTMLInputElement;
        
        searchInput.addEventListener('input', (e) => {
            this.filterLayersListByText(searchInput.value.trim());
        });
    }

    private async renderLayersListFromService(url: string, version?: string, proxyEndpoint?: string) {
        const loadingSpinner = document.getElementById('layers-loading-spinner');
        loadingSpinner.style.display = 'block';
        let availableLayers = await Metadata.getLayersFromCapabilities(url, version, proxyEndpoint);

        let layersListContainer = document.getElementById('layer-list-container');
        const errMsg = document.getElementById('web-layer-search-error');

        const searchInput: HTMLInputElement = document.getElementById('layer-list-search') as HTMLInputElement;
        layersListContainer.innerHTML = '';
        if (availableLayers && availableLayers.length !== 0) {
            availableLayers.sort((a, b) => {
                return a.title.localeCompare(b.title);
            }).forEach(layer => {
                layersListContainer.appendChild(this.renderLayerItem(layer));
            })

            searchInput.style.display = '';
            searchInput.value = '';
            this.createOrUpdateFuseInstance(availableLayers);
        } else {
            layersListContainer.innerHTML = '<div class="alert alert-warning">No layers could be retrieved from the service. You may need to be logged in to the service to see layers, or the service is not advertising any layers at the moment.</div>';
            searchInput.style.display = 'none';
        }
        loadingSpinner.style.display = 'none';
        errMsg.style.display = 'none';

    }

    private renderLayerItem(layer: LayerResource) {
        const layerItemFragment = document.getElementById('web-service-layer-item-template') as HTMLTemplateElement;
        const layerItemInstance = document.importNode(layerItemFragment.content, true);

        const container = layerItemInstance.querySelector('.list-group-item');
        const header = layerItemInstance.querySelector('h5');
        const epsg = layerItemInstance.querySelector('small');
        const desc = layerItemInstance.querySelector('p');
        const btn = layerItemInstance.querySelector('button');

        container.id = layer.name;
        header.textContent = layer.title;
        desc.textContent = layer.abstract;
        epsg.textContent = layer.projection;
        btn.addEventListener('click', (e) => {
            const form = document.getElementById('create-source-form') as HTMLFormElement;
            form.querySelector('input').value = JSON.stringify(layer);
            form.submit();
        })

        return layerItemInstance;

    }

    private filterLayersListByText(text: string) {
        const allItems = document.querySelectorAll('#layer-list-container .list-group-item');
        const errMsg = document.getElementById('web-layer-search-error');
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
            keys: ['title', 'abstract']
        }

        this._fuseInstance = new Fuse(layers, options);
    }
}