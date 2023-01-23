import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { ImageWMS, TileWMS } from "ol/source";
import { Layer as olLayer } from "ol/layer";

export class LegendsPanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;
    //_previousZoom: number;
    constructor(container: string) {
        this.container = container;
    }
    init() {
        console.log(`init called on Legends (container ${this.container})`);
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
        console.log(`render called on Legends (container ${this.container})`);
        let resolution = this.gifwMapInstance.olMap.getView().getResolution();
        this.updateLegend(resolution);
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

    private updateLegend(resolution: number): void {

        (document.querySelector(this.container).querySelector('#gifw-legends-container') as HTMLDivElement).innerHTML = '';
        //get visible WMS based layers
        if (this.gifwMapInstance.anyOverlaysOn()) {
            let roundedZoom = Math.ceil(this.gifwMapInstance.olMap.getView().getZoom());
            let layerGroups = this.gifwMapInstance.getLayerGroupsOfType([LayerGroupType.Overlay, LayerGroupType.UserNative, LayerGroupType.SystemNative])

            let layers: olLayer<any, any>[] = [];
            layerGroups.forEach(lg => {
                layers = layers.concat(lg.olLayerGroup.getLayersArray());
            })

            let switchedOnLayers = layers.filter(l => l.getVisible() === true && l.getMaxZoom() >= roundedZoom && l.getMinZoom() < roundedZoom);
            let legendUrls: { name: string; legendUrl: string }[] = [];
            let nonLegendableLayers: string[] = [];
            switchedOnLayers.sort((a, b) => a.getZIndex() - b.getZIndex()).reverse().forEach(l => {
                let source = l.getSource();
                if (source instanceof TileWMS || source instanceof ImageWMS) {
                    let view = this.gifwMapInstance.olMap.getView();
                    let viewport = this.gifwMapInstance.olMap.getViewport();
                    let params: any = {
                        //if we want to h
                        LEGEND_OPTIONS: "fontAntiAliasing:true;forceLabels:on;countMatched:true;hideEmptyRules:true",
                        bbox: view.calculateExtent().toString(),
                        srcwidth: viewport.clientWidth,
                        srcheight: viewport.clientHeight,
                        crs: view.getProjection().getCode() 
                    }
                    //merge valid params from the source and add to the legend
                    let additionalParams: any = {};
                    let sourceParams = source.getParams();

                    let validProps = ["time", "cql_filter", "filter", "featureid", "elevation", "styles"];
                    //For the sake of sanity, convert the param names to lowercase for processing
                    let lowerCaseParams = Object.fromEntries(
                        Object.entries(sourceParams).map(([k, v]) => [k.toLowerCase(), v])
                    );
                    additionalParams = Object.fromEntries(Object.entries(lowerCaseParams).filter(([key]) => validProps.includes(key)))
                    if (additionalParams?.styles) {
                        //in WMS GetMap, we use the paramater 'STYLES'. In a GetLegendGraphic, we need to use 'STYLE'
                        //so we detect and convert it here, and get rid of the old one
                        additionalParams.style = additionalParams.styles;
                        delete additionalParams.styles;
                    }
                    params = { ...params, ...additionalParams };


                    let legendUrl = { name: l.get('name'), legendUrl: source.getLegendUrl(resolution,params) }
                    legendUrls.push(legendUrl);
                } else {
                    nonLegendableLayers.push(l.get('name'));
                }
            })

            if (legendUrls.length !== 0) {

                legendUrls.forEach((legend, index) => {

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
                this.updateNoLegendsList(nonLegendableLayers, true);
            } else {
                this.updateNoLegendsList(nonLegendableLayers, false);
            }

        } else {
            this.updateNoLegendsList();
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