import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";

export class LegendsPanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;
    //_previousZoom: number;
    constructor(container: string) {
        this.container = container;
    }
    init() {
        this.attachCloseButton();
        this.gifwMapInstance.olMap.on('moveend', e => {
            //check to see if legends panel is visible before calling for a re-render
            //simple visibility check from https://stackoverflow.com/a/21696585/863487
            if ((document.querySelector(this.container) as HTMLElement).offsetParent !== null) {
                this.render();
            }
        });
        this.render();
    };
    render() {
        this.updateLegend();
    };
    /*TODO - Make this generic*/
    private attachCloseButton():void {
        let container = document.querySelector(this.container);
        let closeButton = container.querySelector('button[data-gifw-dismiss-sidebar]');
        if (closeButton !== null) {
            closeButton.addEventListener('click', (e) => {
                Sidebar.close();
            });
        }
    };

    private updateLegend(): void {

        (document.querySelector(this.container).querySelector('#gifw-legends-container') as HTMLDivElement).innerHTML = '';
        const legends = this.gifwMapInstance.getLegendURLs();

        if (legends.availableLegends.length !== 0) {

            legends.availableLegends.forEach((legend, index) => {

                let legendContainer: HTMLElement = document.querySelector(this.container).querySelector('#gifw-legends-container');


                var headerNode = document.createElement("h6");
                headerNode.textContent = legend.name;

                legendContainer.appendChild(headerNode);
                var loadingNode = document.createElement('div')
                loadingNode.className = 'legend-loading mb-2';
                loadingNode.setAttribute('data-legend-name', legend.name);
                loadingNode.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>`

                var imgNode = new Image();
                imgNode.id = "legend-image-" + index;
                imgNode.className = 'legend-image mb-4';
                imgNode.setAttribute('data-legend-name', legend.name);
                imgNode.src = legend.legendUrl;
                legendContainer.appendChild(loadingNode);
                legendContainer.appendChild(imgNode);
                imgNode.addEventListener("error", () => {
                    this.showErrorForLegend(legend.name);
                }, { once: true });
                imgNode.addEventListener("load", () => {
                    this.hideLoadingForLegend(legend.name);
                    if (imgNode.width < 5) {
                        this.showNoFeaturesMessageForLegend(legend.name);
                    }
                }, { once: true });

            })
            this.updateNoLegendsList(legends.nonLegendableLayers, true);
        } else {
            this.updateNoLegendsList(legends.nonLegendableLayers, false);
        }


    }
    private showErrorForLegend(layerName:string) {
        let legendImage = document.querySelector(this.container).querySelector('img.legend-image[data-legend-name="' + layerName + '"]');
        if (legendImage) {
            legendImage.insertAdjacentHTML('afterend', `<div class="alert alert-warning p-2"><i class="bi bi-exclamation-triangle"></i> The legend for this layer failed to load</div>`)
            legendImage.remove();
        }
    }
    private showNoFeaturesMessageForLegend(layerName: string) {
        let legendImage = document.querySelector(this.container).querySelector('img.legend-image[data-legend-name="' + layerName + '"]');
        if (legendImage) {
            legendImage.insertAdjacentHTML('afterend',`<div class="alert alert-info p-2"><i class="bi bi-info-circle"></i> No features in view</div>`)
            legendImage.remove();
        }
    }
    private hideLoadingForLegend(layerName: string) {
        let loadingElement = document.querySelector(this.container).querySelector('div.legend-loading[data-legend-name="' + layerName + '"]');
        if (loadingElement) {
            loadingElement.remove();
        }
    }
    private updateNoLegendsList(nonLegendableLayers:string[] = [], hasLegendableLayers:boolean = false) {
        let noLegendsContainer = (document.querySelector(this.container).querySelector('#gifw-no-legends-container') as HTMLDivElement);
        if (hasLegendableLayers) {
            (noLegendsContainer.querySelector('#gifw-no-legends-no-layers-text') as HTMLDivElement).style.display = 'none';
        } else {
            (noLegendsContainer.querySelector('#gifw-no-legends-no-layers-text') as HTMLDivElement).style.display = 'block';
        }
        let nonLegendableLayersList = noLegendsContainer.querySelector('ul');
        nonLegendableLayersList.innerHTML = '<li>Basemaps</li>';
        if (nonLegendableLayers.length !== 0) {
            nonLegendableLayers.forEach(l => {
                let item = document.createElement('li');
                item.textContent = l;
                nonLegendableLayersList.appendChild(item);
            });
        }
    }
    public setGIFWMapInstance(map: GIFWMap) {
        this.gifwMapInstance = map;
    }
}