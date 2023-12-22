import { SidebarPanel } from "../Interfaces/SidebarPanel";
import { Sidebar } from "../Sidebar";
import { GIFWMap } from "../Map";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer as olLayer } from "ol/layer";
import { Basemap } from "../Interfaces/Basemap";
import { MetadataViewer } from "../Metadata/MetadataViewer";
import { Layer } from "../Interfaces/Layer";
import { Projection } from "ol/proj";

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
    };
    render() {
        this.renderBasemapsPanel();
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

    private renderBasemapsPanel(): void {
        let container = document.querySelector(this.container);
        let basemapsListContainer = container.querySelector('#basemaps-list-container');
        /*TODO - Update rendering to only do a full render once, then just update on following renders*/
        basemapsListContainer.innerHTML = '';
        let basemaps = this.gifwMapInstance.getLayerGroupOfType(LayerGroupType.Basemap)
            .olLayerGroup
            .getLayersArray()
            .sort((basemapA, basemapB) => {
                let sortA = this.gifwMapInstance.config.basemaps.filter(b => b.id === basemapA.get('layerId'))[0].sortOrder;
                let sortB = this.gifwMapInstance.config.basemaps.filter(b => b.id === basemapB.get('layerId'))[0].sortOrder;
                return sortA - sortB;
            });

        basemaps.forEach(basemap => {
            let basemapConfiguration = this.gifwMapInstance.config.basemaps.filter(b => b.id === basemap.get('layerId'))[0];
            basemapsListContainer.append(this.renderBasemapTile(basemap, basemapConfiguration));
            basemapsListContainer.append(this.renderBasemapMeta(basemap, basemapConfiguration));
        })
    }

    private renderBasemapTile(basemap: olLayer<any, any>, basemapConfiguration: Basemap): HTMLElement {
        let card = document.createElement('div')
        card.className = `card text-white basemaps-selector ${basemap.getVisible() ? 'active' : ''}`;
        card.style.backgroundImage = `${basemapConfiguration.previewImageURL ? `url(${basemapConfiguration.previewImageURL})` : ''}`;
        card.id = `basemaps-selector-${basemapConfiguration.id}`;
        let cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        let cardBodyLink = document.createElement('a');
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

        const opacityControls = this.renderSliderControl(basemapConfiguration, basemap.getOpacity()*100, 'opacity');

        const saturationControls = this.renderSliderControl(basemapConfiguration, basemap.get('saturation'), 'saturation');

        const aboutLink = this.renderAboutLink(basemapConfiguration);

        meta.appendChild(opacityControls);
        meta.appendChild(saturationControls);
        meta.appendChild(aboutLink);
        return meta;
    }

    /**
     * Renders a slider control for a particular basemap
     * @param basemapConfiguration - The basemap that will be controlled by this slider
     * @param startingValue - The starting value of the slider
     * @param type - The type of control. Either 'opacity' or 'saturation'
     * @returns HTML Element with the label, slider control and checkbox in a container
     */
    private renderSliderControl(basemapConfiguration: Basemap, startingValue: number = 100, type: "saturation"|"opacity") {
        const controlsContainer = document.createElement('div');
        //label
        const controlLabel = document.createElement('label');
        controlLabel.textContent = type.charAt(0).toUpperCase() + type.slice(1)
        controlLabel.htmlFor = `basemaps-${type}-${basemapConfiguration.id}`;
        controlLabel.className = 'form-label';
        //row/columns for slider control
        const controlSliderRow = document.createElement('div');
        controlSliderRow.className = "row";
        const controlSliderContainer = document.createElement('div');
        controlSliderContainer.className = "col";
        const controlOutputContainer = document.createElement('div');
        controlOutputContainer.className = "col-auto";
        //<output> for slider control
        const controlOutputElement = document.createElement('output');
        controlOutputElement.id = `basemaps-${type}-output-${basemapConfiguration.id}`;
        controlOutputElement.className = 'badge bg-primary';
        controlOutputElement.style.width = '3rem';
        controlOutputElement.innerText = `${(startingValue)}%`;
        //The slider control
        const control = document.createElement('input');
        control.type = 'range';
        control.id = `basemaps-${type}-${basemapConfiguration.id}`;
        control.className = 'form-range';
        control.dataset.gifwControlsBasemap = basemapConfiguration.id;
        control.value = startingValue.toString()
        //build controls
        controlSliderContainer.appendChild(control);
        controlOutputContainer.appendChild(controlOutputElement);
        controlSliderRow.appendChild(controlSliderContainer);
        controlSliderRow.appendChild(controlOutputContainer);
        //checkbox
        const toggleMinimumCheckbox = document.createElement('input');
        toggleMinimumCheckbox.type = 'checkbox';
        toggleMinimumCheckbox.id = `basemaps-${type}-check-${basemapConfiguration.id}`;
        toggleMinimumCheckbox.className = 'form-check-input';
        if (startingValue === 0) {
            toggleMinimumCheckbox.checked = true;
        }
        toggleMinimumCheckbox.dataset.gifwControlsBasemap = basemapConfiguration.id;
        //checkbox label
        const toggleMinimumCheckboxLabel = document.createElement('label');;
        toggleMinimumCheckboxLabel.htmlFor = `basemaps-${type}-check-${basemapConfiguration.id}`;
        toggleMinimumCheckboxLabel.className = 'form-check-label';
        toggleMinimumCheckboxLabel.textContent = type === "saturation" ? "Greyscale" : "Invisible";
        //checkbox container
        const toggleMinimumCheckboxContainer = document.createElement('div');
        toggleMinimumCheckboxContainer.className = 'form-check';
        //build checkbox
        toggleMinimumCheckboxContainer.appendChild(toggleMinimumCheckbox);
        toggleMinimumCheckboxContainer.appendChild(toggleMinimumCheckboxLabel);

        //add controls to container
        controlsContainer.appendChild(controlLabel);
        controlsContainer.appendChild(controlSliderRow);
        controlsContainer.appendChild(toggleMinimumCheckboxContainer);

        //add event listeners
        control.addEventListener('input', e => {
            const value = parseInt((e.currentTarget as HTMLInputElement).value);
            controlOutputElement.innerText = `${(value)}%`
            if (value === 0) {
                toggleMinimumCheckbox.checked = true;
            } else {
                toggleMinimumCheckbox.checked = false;
            }
            if (type === "saturation") {
                this.gifwMapInstance.setSaturationOfActiveBasemap(value);
            } else {
                this.gifwMapInstance.setTransparencyOfActiveBasemap(value);
            }

        });
        toggleMinimumCheckbox.addEventListener('change', e => {
            const element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);

            if (element.checked) {
                control.value = "0";
            } else {
                control.value = "100";
            }
            const evt = new InputEvent('input');
            control.dispatchEvent(evt);
        });
        return controlsContainer;
    }

    private renderAboutLink(basemapConfiguration: Basemap): HTMLElement {
        let link = document.createElement('a');
        link.href = `#basemaps-meta-${basemapConfiguration.id}`;
        link.textContent = 'about';
        link.title = `Learn more about the ${basemapConfiguration.name} basemap`;
        link.dataset.gifwAboutBasemap = basemapConfiguration.id;
        link.addEventListener('click', e => {
            //open modal for metadata
            let eTarget = e.currentTarget as HTMLElement;
            let layerGroup = this.gifwMapInstance.getLayerGroupOfType(LayerGroupType.Basemap);
            let layerConfig = (layerGroup.layers as Layer[]).filter(l => l.id == eTarget.dataset.gifwAboutBasemap);
            let proxyEndpoint = "";
            if (layerConfig[0].proxyMetaRequests) {
                proxyEndpoint = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}proxy`;
            }
            if (layerConfig && layerConfig.length === 1) {
                let olLayer = this.gifwMapInstance.getActiveBasemap();
                MetadataViewer.showMetadataModal(layerConfig[0], olLayer, undefined, proxyEndpoint);
            }
            e.preventDefault();
        })

        let para = document.createElement('p');
        para.className = 'text-end';
        para.appendChild(link);
        return para;
    }

    private toggleBasemap(basemapId: string) {
        let basemapSelector = document.getElementById(`basemaps-selector-${basemapId}`);
        let basemapMeta = document.getElementById(`basemaps-meta-${basemapId}`);
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

            let layerGroup = this.gifwMapInstance.olMap.getLayers().getArray().filter(g => g.get('type') === 'base')[0];
            let basemap = layerGroup.getLayersArray().filter(l => l.get('layerId') == basemapId)[0];
            let otherBasemaps = layerGroup.getLayersArray().filter(l => l.get('layerId') != basemapId);
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