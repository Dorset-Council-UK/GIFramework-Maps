import { Category } from "../Interfaces/Category";
import { Layer } from "../Interfaces/Layer";
import { Layer as olLayer } from "ol/layer";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { LayerListSortingOption } from "../Interfaces/LayerPanel/LayerListSortingOption";
import { LayerFilter } from "../LayerFilter";
import { GIFWMap } from "../Map";
import { MetadataViewer } from "../Metadata/MetadataViewer";
import { LayersPanel } from "./LayersPanel";

export class LayerList {
    layerCategories: Category[];
    gifwMapInstance: GIFWMap;
    layersPanelInstance: LayersPanel;
    ordering: LayerListSortingOption;

    constructor(layersPanelInstance: LayersPanel) {
        this.layerCategories = layersPanelInstance.gifwMapInstance.config.categories;
        this.gifwMapInstance = layersPanelInstance.gifwMapInstance;
        this.layersPanelInstance = layersPanelInstance;
        this.ordering = layersPanelInstance.listSortOrder;
    }

    /**
    * Builds a layer list structure from layer categories
    *
    * @returns HTMLDivElement
    *
    */
    public createLayerList(): HTMLDivElement {
        const container: HTMLDivElement = document.createElement('div');
        container.className = 'accordion accordion-flush';

        this.layerCategories
            .filter(l => l.parentCategory === null && l.layers !== null)
            .sort((a,b) => this.sortFunction(a,b))
            .forEach(category => {
                const accordionItem = document.createElement('div');
                accordionItem.className = `accordion-item`;

                const header = this.createHeader(category);
                accordionItem.appendChild(header)

                const list = this.createListForCategory(category);
                accordionItem.appendChild(list)

                container.appendChild(accordionItem);

            });

        return container;
    }

    /**
    * Creates the header element of a single category in a layer list
    *
    * @returns HTMLHeadingElement
    *
    */
    private createHeader(category: Category): HTMLHeadingElement {

        const headerItem = document.createElement('h2');
        headerItem.className = "accordion-header";
        headerItem.id = `category-${category.id}-heading`;

        const accordionButton = document.createElement('button');
        accordionButton.innerText = category.name;
        accordionButton.className = `accordion-button ${category.open ? '' : 'collapsed'}`;
        accordionButton.type = `button`;
        accordionButton.ariaExpanded = `${category.open ? 'true' : 'false'}`;
        accordionButton.setAttribute('aria-controls', `category-${category.id}`);
        accordionButton.dataset.bsToggle = `collapse`;
        accordionButton.dataset.bsTarget = `#category-${category.id}`;

        headerItem.appendChild(accordionButton);

        return headerItem;

    }

    /**
    * Creates the layer list of a single category in a layer list
    *
    * @returns HTMLDivElement
    *
    */
    private createListForCategory(category: Category): HTMLDivElement {
        const categoryContainer = document.createElement('div');
        categoryContainer.className = `accordion-collapse collapse ${category.open ? 'show' : ''}`;
        categoryContainer.id = `category-${category.id}`;
        categoryContainer.setAttribute('aria-labelled-by',`category-${category.id}-heading`)
        const accordionBody = document.createElement('div');
        accordionBody.className = `accordion-body`;
        const accordion = document.createElement('div');
        accordion.className = `accordion accordion-flush`;

        /*Create child folders*/
        const children = this.layerCategories.filter(lc => lc.parentCategory?.id === category.id).sort((a, b) => this.sortFunction(a, b));

        children.forEach(child => {
            const accordionItem = document.createElement('div');
            accordionItem.className = `accordion-item`;

            const header = this.createHeader(child);
            accordionItem.appendChild(header)

            const list = this.createListForCategory(child);
            accordionItem.appendChild(list)

            accordion.appendChild(accordionItem);
        })

        /*Create list*/
        const listContainer = document.createElement('ul');
        listContainer.className = `list-unstyled`;

        category.layers
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .forEach(layer => {

                const listItem = this.createLayerListItem(layer);
                listContainer.appendChild(listItem);

            });

        accordion.appendChild(listContainer);
        accordionBody.appendChild(accordion);
        categoryContainer.appendChild(accordionBody);

        return categoryContainer;
    }

    /**
    * Creates a single item in a layer list
    *
    * @returns HTMLLIElement
    *
    */
    private createLayerListItem(layer: Layer):HTMLLIElement {
        const olLayer = this.gifwMapInstance.getLayerById(layer.id.toString());
        const layerGroupType = olLayer.get('layerGroupType');
        const listItem = document.createElement('li');
        const formCheckContainer = document.createElement('div')
        formCheckContainer.className = `form-check`;
        const innerFormCheckContainer = document.createElement('div');
        innerFormCheckContainer.className = `inner-form-check`;

        const checkbox = document.createElement('input');
        checkbox.className = `form-check-input`;
        checkbox.type = 'checkbox';
        checkbox.id = `layer-switcher-${layer.id}`;
        checkbox.value = `${layer.id}`;
        if (olLayer.getVisible()) {
            checkbox.checked = true;
        }
        checkbox.addEventListener('change', e => {
            const element: HTMLInputElement = <HTMLInputElement>(e.currentTarget);
            const layerId = element.value;
            this.gifwMapInstance.setLayerVisibility(layerId, element.checked);
        })

        const label = document.createElement('label');
        label.className = `form-check-label`;
        label.htmlFor = `layer-switcher-${layer.id}`;
        label.innerText = layer.name;

        innerFormCheckContainer.appendChild(checkbox);
        innerFormCheckContainer.appendChild(label);

        if (layerGroupType === LayerGroupType.Overlay) {
            const aboutButton = document.createElement('a');
            aboutButton.className = `ms-2`;
            aboutButton.href = `#layer-meta-${layer.id}`;
            aboutButton.dataset.gifwAboutLayer = `${layer.id}`;
            aboutButton.title = `Find out more about the '${layer.name}' layer`;
            aboutButton.innerHTML = `<i class="bi bi-info-square"></i>`;
            aboutButton.addEventListener('click', e => {
                //open modal for metadata
                const eTarget = e.currentTarget as HTMLElement;

                const layerGroup = this.gifwMapInstance.getLayerGroupOfType(LayerGroupType.Overlay);
                const layerConfig = (layerGroup.layers as Layer[]).filter(l => l.id == eTarget.dataset.gifwAboutLayer);
                if (layerConfig && layerConfig.length === 1) {
                    const isFiltered = this.layersPanelInstance.getLayerFilteredStatus(layer, (olLayer as olLayer), false);
                    let proxyEndpoint = "";
                    if (layerConfig[0].proxyMetaRequests) {
                        proxyEndpoint = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}proxy`;
                    }
                    MetadataViewer.showMetadataModal(layerConfig[0], (olLayer as olLayer), isFiltered, proxyEndpoint);
                }
                e.preventDefault();
            });
            innerFormCheckContainer.appendChild(aboutButton);
        }

        if (this.layersPanelInstance.isLayerFilterable(layer, olLayer as olLayer)) {
            const filterButton = document.createElement('a');
            filterButton.id = `gifw-filter-layer-${layer.id}`
            filterButton.className = `ms-2`;
            filterButton.href = `#layer-filter-${layer.id}`;
            filterButton.dataset.gifwFilterLayer = `${layer.id}`;
            filterButton.title = `Filter the '${layer.name}' layer`;
            //Determine if the layer has a user editable filter applied,
            //and display the button as filled if so
            const icon = `bi-funnel${this.layersPanelInstance.getLayerFilteredStatus(layer, (olLayer as olLayer)) ? "-fill" : ""}`;
            filterButton.innerHTML = `<i class="bi ${icon}"></i>`;
            filterButton.addEventListener('click', e => {
                e.preventDefault();
                const layerFilter = new LayerFilter(this.layersPanelInstance, layer);
                layerFilter.showFilterDialog();
            });
            innerFormCheckContainer.appendChild(filterButton);
        }

        if (layer.removable) {
            const deleteButton = document.createElement('a');
            deleteButton.className = `ms-2 text-danger`;
            deleteButton.id = `gifw-remove-layer-${layer.id}`;
            deleteButton.href = `#layer-remove-${layer.id}`;
            deleteButton.dataset.gifwAboutLayer = `${layer.id}`;
            deleteButton.title = `Remove the '${layer.name}' layer from the map`;
            deleteButton.innerHTML = `<i class="bi bi-trash"></i>`;
            deleteButton.addEventListener('click', e => {
                if (confirm("Are you sure you want to remove this layer")) {
                    this.gifwMapInstance.removeLayerById(layer.id);
                }
                e.preventDefault();
            });
            innerFormCheckContainer.appendChild(deleteButton);
        }

        formCheckContainer.appendChild(innerFormCheckContainer);

        listItem.appendChild(formCheckContainer);

        return listItem;
    }

    /**
    * Returns sorting order of 2 elements based on the layer list sorting option of the class
    *
    * @returns number
    *
    */
    private sortFunction(a: Category, b: Category): number {
        if (this.ordering === LayerListSortingOption.Default) {
            return a.order - b.order;
        } else {
            /*Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort*/
            const nameA = a.name.toUpperCase(); // ignore upper and lowercase
            const nameB = b.name.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            // names must be equal
            return 0;
        }
    }

}