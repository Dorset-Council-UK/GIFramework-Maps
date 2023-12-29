import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer as olLayer } from "ol/layer";
import { Basemap } from "../Interfaces/Basemap";
import { MetadataViewer } from "../Metadata/MetadataViewer";
import { Layer } from "../Interfaces/Layer";
import { Projection } from "ol/proj";
import { Source } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";

export class BasemapsPanel implements SidebarPanel {
    container: string;
    gifwMapInstance: GIFWMap;
    constructor(container: string) {
        this.container = container;
    }
    init() {
        this.renderBasemapsPanel();
        this.attachCloseButton();
        //this.attachBasemapSelectors();
        //this.attachMetaControls();
    }
    render() {
        this.renderBasemapsPanel();
    }
    /*TODO - Make this generic*/
    private attachCloseButton():void {
        const container = document.querySelector(this.container);
        const closeButton = container.querySelector('button[data-gifw-dismiss-sidebar]');
        if (closeButton !== null) {
            closeButton.addEventListener('click', () => {
                Sidebar.close();
            });
        }
    }

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

    private renderBasemapTile(basemap: olLayer<Source, LayerRenderer<olLayer>>, basemapConfiguration: Basemap): HTMLElement {
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

    private renderBasemapMeta(basemap: olLayer<Source, LayerRenderer<olLayer>>, basemapConfiguration: Basemap): HTMLElement {
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

        const opacityControls = this.renderOpacityControls(basemapConfiguration, basemap.getOpacity());

        const saturationControls = this.renderSaturationControls(basemapConfiguration, basemap.get('saturation'));

        const aboutLink = this.renderAboutLink(basemapConfiguration);

        meta.appendChild(opacityControls);
        meta.appendChild(saturationControls);
        meta.appendChild(aboutLink);
        return meta;
    }

    private renderOpacityControls(basemapConfiguration: Basemap, startingOpacity: number): HTMLElement {

        const opacityControlsContainer = document.createElement('div');

        const opacityLabel = document.createElement('label');
        opacityLabel.textContent = 'Transparency'
        opacityLabel.htmlFor = `basemaps-transparency-${basemapConfiguration.id}`;
        opacityLabel.className = 'form-label';

        const opacityControl = document.createElement('input');
        opacityControl.type = 'range';
        opacityControl.id = `basemaps-transparency-${basemapConfiguration.id}`;
        opacityControl.className = 'form-range';
        opacityControl.dataset.gifwControlsTransparencyBasemap = basemapConfiguration.id;
        opacityControl.value = (startingOpacity * 100).toString();
        opacityControl.addEventListener('input', e => {
            const linkedInvisibleCheckbox: HTMLInputElement = document.querySelector(this.container).querySelector(`input[data-gifw-controls-invisible-basemap="${basemapConfiguration.id}"]`);
            const opacity = parseInt((e.currentTarget as HTMLInputElement).value);
            if (opacity === 0) {
                linkedInvisibleCheckbox.checked = true;
            } else {
                linkedInvisibleCheckbox.checked = false;
            }
            this.gifwMapInstance.setTransparencyOfActiveBasemap(opacity);
        });

        const invisibleCheckbox = document.createElement('input');
        invisibleCheckbox.type = 'checkbox';
        invisibleCheckbox.id = `basemaps-invisible-check-${basemapConfiguration.id}`;
        invisibleCheckbox.className = 'form-check-input';
        if (startingOpacity === 0) {
            invisibleCheckbox.checked = true;
        }
        invisibleCheckbox.dataset.gifwControlsInvisibleBasemap = basemapConfiguration.id;
        invisibleCheckbox.addEventListener('change', e => {
            const element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

            const basemapId = element.dataset.gifwControlsInvisibleBasemap;
            const linkedTransparencySlider: HTMLInputElement = document.querySelector(this.container).querySelector(`input[data-gifw-controls-transparency-basemap="${basemapId}"]`);
            if (element.checked) {
                linkedTransparencySlider.value = "0";
            } else {
                linkedTransparencySlider.value = "100";
            }
            const evt = new InputEvent('input');
            linkedTransparencySlider.dispatchEvent(evt);
        });

        const invisibleCheckboxLabel = document.createElement('label');
        invisibleCheckboxLabel.htmlFor = `basemaps-invisible-check-${basemapConfiguration.id}`;
        invisibleCheckboxLabel.className = 'form-check-label';
        invisibleCheckboxLabel.textContent = "Invisible";

        const invisibleCheckboxContainer = document.createElement('div');
        invisibleCheckboxContainer.className = 'form-check';

        invisibleCheckboxContainer.appendChild(invisibleCheckbox);
        invisibleCheckboxContainer.appendChild(invisibleCheckboxLabel);

        opacityControlsContainer.appendChild(opacityLabel);
        opacityControlsContainer.appendChild(opacityControl);
        opacityControlsContainer.appendChild(invisibleCheckboxContainer);

        return opacityControlsContainer;
    }

    private renderSaturationControls(basemapConfiguration: Basemap, startingSaturation: number = 100) {
        const saturationControlsContainer = document.createElement('div');

        const saturationLabel = document.createElement('label');
        saturationLabel.textContent = 'Saturation'
        saturationLabel.htmlFor = `basemaps-saturation-${basemapConfiguration.id}`;
        saturationLabel.className = 'form-label';

        const saturationControl = document.createElement('input');
        saturationControl.type = 'range';
        saturationControl.id = `basemaps-saturation-${basemapConfiguration.id}`;
        saturationControl.className = 'form-range';
        saturationControl.dataset.gifwControlsSaturationBasemap = basemapConfiguration.id;
        saturationControl.value = (startingSaturation).toString();
        saturationControl.addEventListener('input', e => {
            const linkedGreyscaleCheckbox: HTMLInputElement = document.querySelector(this.container).querySelector(`input[data-gifw-controls-greyscale-basemap="${basemapConfiguration.id}"]`);
            const saturation = parseInt((e.currentTarget as HTMLInputElement).value);
            if (saturation === 0) {
                linkedGreyscaleCheckbox.checked = true;
            } else {
                linkedGreyscaleCheckbox.checked = false;
            }
            this.gifwMapInstance.setSaturationOfActiveBasemap(saturation);
        });

        const greyscaleCheckbox = document.createElement('input');
        greyscaleCheckbox.type = 'checkbox';
        greyscaleCheckbox.id = `basemaps-saturation-check-${basemapConfiguration.id}`;
        greyscaleCheckbox.className = 'form-check-input';
        if (startingSaturation === 0) {
            greyscaleCheckbox.checked = true;
        }
        greyscaleCheckbox.dataset.gifwControlsGreyscaleBasemap = basemapConfiguration.id;
        greyscaleCheckbox.addEventListener('change', e => {
            const element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

            const basemapId = element.dataset.gifwControlsGreyscaleBasemap;
            const linkedGreyscaleSlider: HTMLInputElement = document.querySelector(this.container).querySelector(`input[data-gifw-controls-saturation-basemap="${basemapId}"]`);
            if (element.checked) {
                linkedGreyscaleSlider.value = "0";
            } else {
                linkedGreyscaleSlider.value = "100";
            }
            const evt = new InputEvent('input');
            linkedGreyscaleSlider.dispatchEvent(evt);
        });

        const greyscaleCheckboxLabel = document.createElement('label');
        greyscaleCheckboxLabel.htmlFor = `basemaps-saturation-check-${basemapConfiguration.id}`;
        greyscaleCheckboxLabel.className = 'form-check-label';
        greyscaleCheckboxLabel.textContent = "Greyscale";

        const invisibleCheckboxContainer = document.createElement('div');
        invisibleCheckboxContainer.className = 'form-check';

        invisibleCheckboxContainer.appendChild(greyscaleCheckbox);
        invisibleCheckboxContainer.appendChild(greyscaleCheckboxLabel);

        saturationControlsContainer.appendChild(saturationLabel);
        saturationControlsContainer.appendChild(saturationControl);
        saturationControlsContainer.appendChild(invisibleCheckboxContainer);

        return saturationControlsContainer;
    }

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