import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer as olLayer } from "ol/layer";
import { Basemap } from "../Interfaces/Basemap";
import { MetadataViewer } from "../Metadata/MetadataViewer";
import { Layer } from "../Interfaces/Layer";
import { Projection } from "ol/proj";
import { PanelHelper } from "./PanelHelper";

export class BasemapsPanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;
    constructor(container: string) {
        this.container = container;
    }
    init() {
        this.renderBasemapsPanel();
        this.attachCloseButton();
    };
    render() {
        this.renderBasemapsPanel();
    };
    /*TODO - Make this generic*/
    private attachCloseButton():void {
        const container = document.querySelector(this.container);
        const closeButton = container.querySelector('button[data-gifw-dismiss-sidebar]');
        if (closeButton !== null) {
            closeButton.addEventListener('click', (e) => {
                Sidebar.close();
            });
        }
    };

    private renderBasemapsPanel(): void {
        const container = document.querySelector(this.container);
        const basemapsListContainer = container.querySelector('#basemaps-list-container');
        /*TODO - Update rendering to only do a full render once, then just update on following renders*/
        basemapsListContainer.innerHTML = '';
        const basemaps = this.gifwMapInstance.getLayerGroupOfType(LayerGroupType.Basemap)
            .olLayerGroup
            .getLayersArray()
            .sort((basemapA, basemapB) => {
                const sortA = this.gifwMapInstance.config.basemaps.filter(b => b.id === basemapA.get('layerId'))[0].sortOrder;
                const sortB = this.gifwMapInstance.config.basemaps.filter(b => b.id === basemapB.get('layerId'))[0].sortOrder;
                return sortA - sortB;
            });

        basemaps.forEach(basemap => {
            const basemapConfiguration = this.gifwMapInstance.config.basemaps.filter(b => b.id === basemap.get('layerId'))[0];
            basemapsListContainer.append(this.renderBasemapTile(basemap, basemapConfiguration));
            basemapsListContainer.append(this.renderBasemapMeta(basemap, basemapConfiguration));
        })
    }

    /**
     * Create the basemap tile element
     * @param basemap The OpenLayers layer we are creating a tile for
     * @param basemapConfiguration The GIFramework Basemaps configuration for the basemap
     * @returns Bootstrap Card element
     */
    private renderBasemapTile(basemap: olLayer<any, any>, basemapConfiguration: Basemap): HTMLElement {
        const card = document.createElement('div')
        card.className = `card text-white basemaps-selector ${basemap.getVisible() ? 'active' : ''}`;
        card.style.backgroundImage = `${basemapConfiguration.previewImageURL ? `url(${basemapConfiguration.previewImageURL})` : ''}`;
        card.id = `basemaps-selector-${basemapConfiguration.id}`;
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        const cardBodyLink = document.createElement('a');
        cardBodyLink.href = '#';
        cardBodyLink.textContent = basemapConfiguration.name;
        cardBodyLink.className = 'card-title stretched-link';
        cardBodyLink.dataset.gifwBasemapId = basemapConfiguration.id;
        cardBodyLink.addEventListener('click', e => {
            e.preventDefault();
            this.toggleBasemap(basemapConfiguration.id);
        })
        cardBody.appendChild(cardBodyLink);
        card.appendChild(cardBody);
        return card;
    }

    /**
     * Create the meta elements for a particular basemap, including projection warnings, opacity/saturation sliders and metadata links
     * @param basemap The OpenLayers layer we are creating a tile for
     * @param basemapConfiguration The GIFramework Basemaps configuration for the basemap
     * @returns HTML Div element containing relevant meta information
     */
    private renderBasemapMeta(basemap: olLayer<any, any>, basemapConfiguration: Basemap): HTMLElement {
        const meta = document.createElement('div');
        meta.className = `basemaps-meta border-start border-bottom border-2 d-block ${basemap.getVisible() ? 'd-block' : 'd-none'}`;
        meta.id = `basemaps-meta-${basemapConfiguration.id}`;

        const source = basemap.getSource();
        if (source.getProjection) {
            const proj = source.getProjection() as Projection;
            if (proj && (proj.getCode() !== this.gifwMapInstance.olMap.getView().getProjection().getCode())) {
                meta.insertAdjacentHTML(
                    'afterbegin',
                    `<div class="alert alert-warning">The projection of the source data is different from the map. This basemap may have some rendering issues (such as blurring or mis-matching)</div>`
                );
            }
        }
        const opacityControls = PanelHelper.renderSliderControl(basemapConfiguration.id, basemap.getOpacity() * 100, 5, 'opacity', 'basemap', this.gifwMapInstance);

        const saturationControls = PanelHelper.renderSliderControl(basemapConfiguration.id, basemap.get('saturation'), 5, 'saturation', 'basemap', this.gifwMapInstance);

        const aboutLink = this.renderAboutLink(basemapConfiguration);

        meta.appendChild(opacityControls);
        meta.appendChild(saturationControls);
        meta.appendChild(aboutLink);
        return meta;
    }

    /**
     * Create the about link for a basemap
     * @param basemapConfiguration The GIFramework Basemaps configuration for the basemap
     * @returns HTML Paragraph that opens metadata information for the basemap
     */
    private renderAboutLink(basemapConfiguration: Basemap): HTMLElement {
        const link = document.createElement('a');
        link.href = `#basemaps-meta-${basemapConfiguration.id}`;
        link.textContent = 'about';
        link.title = `Learn more about the ${basemapConfiguration.name} basemap`;
        link.dataset.gifwAboutBasemap = basemapConfiguration.id;
        link.addEventListener('click', e => {
            //open modal for metadata
            const eTarget = e.currentTarget as HTMLElement;
            const layerGroup = this.gifwMapInstance.getLayerGroupOfType(LayerGroupType.Basemap);
            const layerConfig = (layerGroup.layers as Layer[]).filter(l => l.id == eTarget.dataset.gifwAboutBasemap);
            let proxyEndpoint = "";
            if (layerConfig[0].proxyMetaRequests) {
                proxyEndpoint = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}proxy`;
            }
            if (layerConfig && layerConfig.length === 1) {
                const olLayer = this.gifwMapInstance.getActiveBasemap();
                MetadataViewer.showMetadataModal(layerConfig[0], olLayer, undefined, proxyEndpoint);
            }
            e.preventDefault();
        })

        const para = document.createElement('p');
        para.className = 'text-end';
        para.appendChild(link);
        return para;
    }

    /**
     * Toggles a basemap on and turns off other basemaps, as well as hiding and showing relevant elements in the panel
     * @param basemapId The id of the basemap to toggle
     */
    private toggleBasemap(basemapId: string) {
        const basemapSelector = document.getElementById(`basemaps-selector-${basemapId}`);
        const basemapMeta = document.getElementById(`basemaps-meta-${basemapId}`);
        if (basemapSelector.classList.contains('active')) {
            //basemap is already active
        } else {
            //remove active from all other basemap selectors
            document.querySelectorAll('.basemaps-selector').forEach(bms => {
                bms.classList.remove('active');
            });
            //hide meta from all other basemap selectors
            document.querySelectorAll('.basemaps-meta').forEach(bmm => {
                bmm.classList.add('d-none');
            })

            basemapSelector.classList.add('active');
            basemapMeta.classList.remove('d-none');

            const layerGroup = this.gifwMapInstance.olMap.getLayers().getArray().filter(g => g.get('type') === 'base')[0];
            const basemap = layerGroup.getLayersArray().filter(l => l.get('layerId') == basemapId)[0];
            const otherBasemaps = layerGroup.getLayersArray().filter(l => l.get('layerId') != basemapId);
            basemap.setVisible(true)
            otherBasemaps.forEach(b => {
                b.setVisible(false);
            })
        }
    }

    public setGIFWMapInstance(map: GIFWMap) {
        this.gifwMapInstance = map;
    }
}