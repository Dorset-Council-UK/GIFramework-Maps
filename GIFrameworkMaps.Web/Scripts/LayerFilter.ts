import { Modal, Tooltip } from "bootstrap";
import And from "ol/format/filter/And";
import EqualTo from "ol/format/filter/EqualTo";
import Filter from "ol/format/filter/Filter";
import GreaterThan from "ol/format/filter/GreaterThan";
import GreaterThanOrEqualTo from "ol/format/filter/GreaterThanOrEqualTo";
import IsBetween from "ol/format/filter/IsBetween";
import IsLike from "ol/format/filter/IsLike";
import IsNull from "ol/format/filter/IsNull";
import LessThan from "ol/format/filter/LessThan";
import LessThanOrEqualTo from "ol/format/filter/LessThanOrEqualTo";
import Not from "ol/format/filter/Not";
import NotEqualTo from "ol/format/filter/NotEqualTo";
import Or from "ol/format/filter/Or";
import { Layer as olLayer } from "ol/layer";
import BaseLayer from "ol/layer/Base";
import { ImageWMS, TileWMS } from "ol/source";
import { v4 as uuidv4 } from 'uuid';
import { Layer } from "./Interfaces/Layer";
import { Capability, CapabilityType } from "./Interfaces/OGCMetadata/BasicServerCapabilities";
import { Property } from "./Interfaces/OGCMetadata/DescribeFeatureType";
import { PagedUniqueResponse } from "./Interfaces/OGCMetadata/PagedUniqueResponse";
import { GIFWMap } from "./Map";
import { Metadata } from "./Metadata/Metadata";
import CQL, { FilterType, PropertyTypes } from "./OL Extensions/CQL";
import { LayersPanel } from "./Panels/LayersPanel";
import { Util } from "./Util";

export class LayerFilter {
    gifwMapInstance: GIFWMap;
    layersPanelInstance: LayersPanel;
    layerConfig: Layer;
    layer: BaseLayer;
    layerProperties: Property[];
    filterModal: Modal;
    cqlFormatter: CQL;
    defaultFilter: string;
    useWPSSearchSuggestions: boolean = false;
    wpsExecuteCapability: Capability;
    _uniquePropValuesCache: PropertyValuesCache[] = [];
    constructor(layersPanelInstance: LayersPanel, layerConfig: Layer) {
        this.gifwMapInstance = layersPanelInstance.gifwMapInstance;
        this.layersPanelInstance = layersPanelInstance;
        this.layerConfig = layerConfig;
        this.layer = this.gifwMapInstance.getLayerById(this.layerConfig.id.toString());
        this.filterModal = new Modal(document.getElementById('layer-filtering-modal'), {});
        //bind the click handler to this so we can remove and add it properly. Bit of a hack!
        this.handleClick = this.handleClick.bind(this);
        document.getElementById('layer-filtering-modal').addEventListener('hide.bs.modal', () => {
            const filterModalSubmit = document.querySelector('#layer-filtering-apply');
            filterModalSubmit.removeEventListener('click', this.handleClick);
        })
        this.cqlFormatter = new CQL();
       
        this.defaultFilter = this.layer.get('gifw-default-filter');
    }

    /**
     * Shows the filter dialog based on the class properties
     * */
    public async showFilterDialog() {
        try {
            if (!this.layerConfig) {
                this.filterModal.hide();
                Util.Alert.showPopupError("There was a problem", "<p>This layer cannot be filtered</p>")
                return;
            }
            const filterModalHeader = document.querySelector('#layer-filtering-modal .modal-title');
            const filterModalContent = document.querySelector('#layer-filtering-modal .modal-body');
            filterModalHeader.textContent = `Filter layer '${this.layerConfig.name}'`;
            const descriptionHTML: string = `<h5 class="card-title placeholder-glow">
                                                <span class="placeholder col-6"></span>
                                            </h5>
                                            <p class="card-text placeholder-glow">
                                                <span class="placeholder col-7"></span>
                                                <span class="placeholder col-4"></span>
                                                <span class="placeholder col-4"></span>
                                                <span class="placeholder col-6"></span>
                                                <span class="placeholder col-8"></span>
                                            </p>`;

            filterModalContent.innerHTML = descriptionHTML;
            this.filterModal.show();

            await this.initPropertyValueSuggestions();

            this.layerProperties = await this.getPropertiesForLayer();
            const source = (this.layer as olLayer).getSource();

            if (!(source instanceof TileWMS || source instanceof ImageWMS)) {
                this.filterModal.hide();
                Util.Alert.showPopupError("There was a problem", "<p>This layer cannot be filtered</p>")
                return;
            }
            if (!(this.layerProperties && this.layerProperties.length !== 0)) {
                this.filterModal.hide();
                Util.Alert.showPopupError("There was a problem", "<p>We couldn't get the properties for this layer, so you can't filter this layer right now</p>")
                return;
            }
            //load the filter details into the dialog
            const params = source.getParams();
            const cqlFilter = this.extractCQLFilterFromParams(params);

            let filter;

            const filterContainer = document.createElement('div');
            filterContainer.id = "gifw-filter-list";

            const defaultFilterContainer = document.createElement('div');
            if (this.defaultFilter && !this.layerConfig.defaultFilterEditable) {
                defaultFilterContainer.className = "alert alert-info";
                defaultFilterContainer.innerHTML = `This layer has a default filter which is shown below. 
                                                Any clauses you include here will be appended to it using AND
                                                <br/><code>${this.defaultFilter}</code>`
                if (cqlFilter !== this.defaultFilter) {
                    let editableCQLFilter = cqlFilter.replace(`(${this.defaultFilter}) AND (`, '')
                    editableCQLFilter = editableCQLFilter.slice(0, -1);
                    filter = this.convertTextFiltersToOLFilter(editableCQLFilter);
                }
            } else {
                filter = this.convertTextFiltersToOLFilter(cqlFilter, this.layer as olLayer);
            }

            if (filter) {
                const filterHtml = this.createFilterHTMLFromExistingFilter(filter);
                filterContainer.appendChild(filterHtml);
            } else {
                const filterHtml = this.createEmptyFilterHTML();
                filterContainer.appendChild(filterHtml);
            }

            filterContainer.querySelectorAll('.gifw-filter').forEach(filterRow => {
                this.updateSuggestionsListForFilter(filterRow as HTMLElement);
            })

            filterModalContent.innerHTML = '';
            filterModalContent.appendChild(defaultFilterContainer);
            filterModalContent.appendChild(filterContainer);

            const clearAllLink = document.createElement('a');
            clearAllLink.href = "#";
            clearAllLink.className = "text-danger";
            clearAllLink.textContent = "Remove all filters";
            clearAllLink.addEventListener('click', e => {
                this.clearFilters();
                e.preventDefault();
            });
            filterModalContent.appendChild(clearAllLink);
            const filterModalSubmit = document.querySelector('#layer-filtering-apply');
            filterModalSubmit.addEventListener('click', this.handleClick);
        } catch (e) {
            console.error(e);
            this.filterModal.hide();
            Util.Alert.showPopupError("There was a problem", "<p>Sorry, we had an issue building the filtering dialog, so you can't filter this layer right now.</p>")
        }
    }

    /**
     * Handles the Apply button. Validates and applies the filter and then hides the dialog
     * */
    private handleClick(): void {
        if (this.validateFilter()) {
            this.applyFilter();
            this.filterModal.hide();
        }
    }

    /**
     * Clears all the filters from the DOM. Does not set the layer paramaters
     * */
    private clearFilters(): void {
        document.querySelectorAll('.gifw-child-filter-section').forEach(f => f.remove());
        document.querySelectorAll('.gifw-filter').forEach(f => f.remove())
    }

    /**
     * Creates a HTML element for a single OpenLayers `Filter`
     * @param filter{Filter} The OpenLayers Filter to render a HTML element for
     * @returns HTMLElement 
     */
    private createFilterHTMLFromExistingFilter(filter: Filter): HTMLElement {

        const filterContainer = document.createElement('div');
        filterContainer.className = "gifw-parent-filter-section";
        if (filter instanceof And || filter instanceof Or || filter instanceof Not) {
            if (filter instanceof Not) {
                //we need to handle this one differently, as it is essentially
                //an AND filter but with a bit of wrapping negation around it, but
                //for the UI, we just show it as a dropdown same as the AND and OR
                const filterHtml = this.createFilterHTML(filter.condition);
                /*Forcibly set the logic operator to 'Not'*/
                const opts = (filterHtml.querySelector('.logicSelector select') as HTMLSelectElement).options;
                const targetValue = [...opts].findIndex(opt => opt.value === 'Not');
                (filterHtml.querySelector('.logicSelector select') as HTMLSelectElement).selectedIndex = targetValue;

                filterContainer.appendChild(filterHtml);

            } else {
                const filterHtml = this.createFilterHTML(filter);
                filterContainer.appendChild(filterHtml);
            }
        } else {
            const andFilterType = this.cqlFormatter.filterTypes.find(f => f.tagName === "And");
            const filterHtml = this.createLogicalFilterHTML(filter, andFilterType);
            filterContainer.appendChild(filterHtml);
        }
        return filterContainer;
    }

    /**
     * Creates a HTML element for an empty filter section
     * @param child{boolean} Optional boolean to indicate if this should be rendered as a child
     * @returns HTMLElement
     */
    private createEmptyFilterHTML(child: boolean = false): HTMLElement {
        const filterContainer = document.createElement('div');
        if (child) {
            filterContainer.className = "gifw-child-filter-section ms-2 ps-2 border-2 border-start"
        } else {
            filterContainer.className = "gifw-parent-filter-section";
        }
        //get available operators by property type
        const andFilterType = this.cqlFormatter.filterTypes.find(f => f.tagName === "And");

        const filter = new EqualTo(this.layerProperties[0].name, "");
        const filterHtml = this.createLogicalFilterHTML(filter, andFilterType);
        filterContainer.appendChild(filterHtml);
        return filterContainer;
    }

    /**
     * Creates a HTML element for a single filter row with default starting values.
     * */
    private createEmptyFilterRow(): HTMLElement {
        const filter = new EqualTo(this.layerProperties[0].name, "");
        const filterHtml = this.createFilterHTML(filter);
        this.updateSuggestionsListForFilter(filterHtml);
        return filterHtml;
    }

    /**
     * Creates a HTML element for a single Logical (and/or/not) filter
     * @param filter{Filter} The OpenLayers filter
     * @param filterType{FilterType} The local definition of the type of filter
     * @param isChild{boolean} Optional boolean to indicate if this is a child. Defaults to false.
     * 
     * @returns HTMLDivElement
     */
    private createLogicalFilterHTML(filter: Filter, filterType: FilterType, isChild = false) {
        const filterRow = document.createElement('div')
        filterRow.className = "row pb-2 gifw-filter-section";
 
        const logicalContainer = this.createConditionWrapper(filter);

        if (filterType.type === "negation") {

            //we need to handle this one differently, as it is essentially
            //an AND filter but with a bit of wrapping negation around it, but
            //for the UI, we just show it as a dropdown same as the AND and OR
            /*Forcibly set the logic operator to 'Not'*/
            const opts = (logicalContainer.querySelector('.logicSelector select') as HTMLSelectElement).options;
            const targetValue = [...opts].findIndex(opt => opt.value === 'Not');
            (logicalContainer.querySelector('.logicSelector select') as HTMLSelectElement).selectedIndex = targetValue;

            if ((filter as Not).condition instanceof And || (filter as Not).condition instanceof Or) {
                for (const filterCondition of ((filter as Not).condition as And).conditions) {
                    const filterHtml = this.createFilterHTML(filterCondition, true);
                    logicalContainer.appendChild(filterHtml);
                }
            } else {
                const filterHtml = this.createFilterHTML((filter as Not).condition);
                logicalContainer.appendChild(filterHtml);
            }

        } else {
            if (filter instanceof And || filter instanceof Or) {
                for (const filterCondition of (filter as And).conditions) {
                    const filterHtml = this.createFilterHTML(filterCondition, true);
                    logicalContainer.appendChild(filterHtml);
                }
            } else {
                const filterHtml = this.createFilterHTML(filter);
                logicalContainer.appendChild(filterHtml);
            }
        }

        logicalContainer.appendChild(this.createAddConditionButton());
        logicalContainer.appendChild(this.createAddGroupButton());
        filterRow.appendChild(logicalContainer);

        if (isChild) {
            const container = document.createElement('div');
            container.className = 'gifw-child-filter-section ms-2 ps-2 border-2 border-start';
            container.appendChild(filterRow);
            return container;
        } else {
            return filterRow;
        }
    }

    /**
     * Creates a HTML Element for a filter. 
     * @param filter{Filter} The OpenLayers filter
     * @param isChildLogical{boolean} Optional boolean to indicate if this filter is a logical child filter. Defaults to false
     */
    private createFilterHTML(filter: Filter, isChildLogical = false):HTMLElement {
        const filterTagName = filter.getTagName();
        const filterType = this.cqlFormatter.filterTypes.find(f => f.tagName === filterTagName);
        if (filterType) {
            let returnHtml: HTMLElement;
            switch (filterType.type) {
                case "singleValue":
                    returnHtml = this.createSingleValueFilterHTML(filter, filterType);
                    break;
                case "twoValue":
                    returnHtml = this.createTwoValueFilterHTML(filter, filterType);
                    break;
                case "nullValue":
                    returnHtml = this.createNullValueFilterHTML(filter, filterType);
                    break;
                case "logical":
                case "negation":
                    returnHtml = this.createLogicalFilterHTML(filter, filterType, isChildLogical);
                    break;
            }
            return returnHtml;

        } else {
            console.warn('filter could not be processed', filter);
        }
        return null;
    }

    /**
     * Creates an input element for a single value field
     * @param filter{Filter} Optional - The OpenLayers filter
     * @param propertyType{PropertyTypes} Optional - The local property type
     */
    private createSingleValueEditor(filter: Filter, propertyType: PropertyTypes, filterType: FilterType, datalistId:string) {

        let inputType = "text";
        if (propertyType) {
            switch (propertyType) {
                case "date-time":
                case "date":
                    //TODO - Use datetime-local for time based filters
                    inputType = "date";
                    break;
                case "int":
                    inputType = "number";
                    break;
                case "number":
                    inputType = "number";
                    break
            }
        }

        const valueFieldId = uuidv4();
        const hiddenLabel = document.createElement('label');
        hiddenLabel.className = "visually-hidden";
        hiddenLabel.textContent = "Expression for this filter";
        hiddenLabel.htmlFor = valueFieldId;
        const valueField = document.createElement('input')
        valueField.className = "form-control"
        valueField.type = inputType;
        if (propertyType === "int") {
            valueField.step = "1";
        } else if (propertyType === "string") {
            let title = "Case sensitive";
            if (filterType && filterType.tagName === "PropertyIsLike") {
                title = `${title}<br/>Use * for wildcard<br/>Use . for single character wildcards<br/>Use ! to escape those characters`;
            }
            //check to see if operator is 'like'
            valueField.dataset.bsToggle = "tooltip";
            valueField.dataset.bsHtml = "true";
            valueField.dataset.bsTitle = title;
            Tooltip.getOrCreateInstance(valueField);
        }
        if (filter) {
            if (filter instanceof IsLike) {
                valueField.value = CQL.convertCQLWildcardPatternToOLPattern(filter.pattern.toString());
            } else {
                valueField.value = (filter as EqualTo).expression.toString();
            }
        }
        valueField.id = valueFieldId;
        valueField.setAttribute('list', datalistId);
        return valueField;
    }

    /**
     * Creates the HTML Element for a single value filter
     * @param filter{Filter} The OpenLayers filter
     * @param filterType{FilterType} The local definition of the type of filter
     */
    private createSingleValueFilterHTML(filter: Filter, filterType: FilterType) {
        const filterRow = document.createElement('div')
        filterRow.className = "row pb-2 gifw-filter";

        const propertyCol = this.createPropertyColumnNode((filter as EqualTo).propertyName);
        const propertySelectList = propertyCol.querySelector('select');
        const propertyType: PropertyTypes = propertySelectList.options[propertySelectList.selectedIndex].dataset.gifwFilterPropType as PropertyTypes;
        const operatorCol = this.createOperatorColumnNode(propertyType, filterType.friendlyName);
        
        const valuesCol = this.createValuesEditorNode(filterType, filter, propertyType);
        const deleteCol = this.createDeleteButton();

        filterRow.appendChild(propertyCol);
        filterRow.appendChild(operatorCol);
        filterRow.appendChild(valuesCol);
        filterRow.appendChild(deleteCol);

        return filterRow;

    }

    /**
     * Creates a HTML element containing two inputs for filters that requires 2 inputs (e.g. BETWEEN)
     * @param filter{Filter} Optional - The OpenLayers filter
     * @param propertyType Optional - The local definition of the Property Type
     */
    private createTwoValueEditor(filter: Filter, propertyType: PropertyTypes, datalistId: string) {
        const valuesRow = document.createElement('div');
        valuesRow.className = "row";

        let inputType = "text";
        if (propertyType) {
            switch (propertyType) {
                case "date-time":
                case "date":
                    //TODO - Use datetime-local for time based filters?
                    inputType = "date";
                    break;
                case "int":
                case "number":
                    inputType = "number";
                    break;
            }
        }

        const value1FieldId = uuidv4();
        const hiddenLabel1 = document.createElement('label');
        hiddenLabel1.className = "visually-hidden";
        hiddenLabel1.textContent = "Lower boundary for this filter";
        hiddenLabel1.htmlFor = value1FieldId;
        const value1Field = document.createElement('input')
        value1Field.className = "form-control"

        value1Field.type = inputType;
        if (propertyType === "int") {
            value1Field.step = "1";
        }
        if (filter) {
            value1Field.value = (filter as IsBetween).lowerBoundary.toString();
        }
        value1Field.id = value1FieldId;
        value1Field.setAttribute('list', datalistId);

        const value2FieldId = uuidv4();
        const hiddenLabel2 = document.createElement('label');
        hiddenLabel2.className = "visually-hidden";
        hiddenLabel2.textContent = "Upper boundary for this filter";
        hiddenLabel2.htmlFor = value2FieldId;
        const value2Field = document.createElement('input')
        value2Field.className = "form-control"
        value2Field.type = inputType;
        if (propertyType === "int") {
            value2Field.step = "1";
        }
        if (filter) {
            value2Field.value = (filter as IsBetween).upperBoundary.toString();
        }
        value2Field.id = value2FieldId;
        value2Field.setAttribute('list', datalistId);

        const value1Col = document.createElement('div');
        value1Col.className = 'col-6 p-0';
        value1Col.appendChild(hiddenLabel1);
        value1Col.appendChild(value1Field);

        const value2Col = document.createElement('div');
        value2Col.className = 'col-6 p-0 ps-1';
        value2Col.appendChild(hiddenLabel2);
        value2Col.appendChild(value2Field);

        valuesRow.appendChild(value1Col);
        valuesRow.appendChild(value2Col);

        return valuesRow;
    }

    /**
     * Creates the HTML Element for a filter that requires 2 inputs (e.g. BETWEEN)
     * @param filter{Filter} Optional - The OpenLayers filter
     * @param filterType{FilterType} The local definition of the type of filter
     */
    private createTwoValueFilterHTML(filter: Filter, filterType: FilterType) {
        const filterRow = document.createElement('div')
        filterRow.className = "row pb-2 gifw-filter";

        const propertyCol = this.createPropertyColumnNode((filter as EqualTo).propertyName);
        const propertySelectList = propertyCol.querySelector('select');
        const propertyType: PropertyTypes = propertySelectList.options[propertySelectList.selectedIndex].dataset.gifwFilterPropType as PropertyTypes;
        const operatorCol = this.createOperatorColumnNode(propertyType, filterType.friendlyName);

        const valuesCol = this.createValuesEditorNode(filterType, filter, propertyType);

        const deleteCol = this.createDeleteButton();

        filterRow.appendChild(propertyCol);
        filterRow.appendChild(operatorCol);
        filterRow.appendChild(valuesCol);
        filterRow.appendChild(deleteCol);

        return filterRow;
    }

    /**
     * Creates the HTML Element for a null value filter
     * @param filter{Filter} Optional - The OpenLayers filter
     * @param filterType{FilterType} The local definition of the type of filter
     */
    private createNullValueFilterHTML(filter: Filter, filterType: FilterType) {
        const filterRow = document.createElement('div')
        filterRow.className = "row pb-2 gifw-filter";

        const propertyCol = this.createPropertyColumnNode((filter as EqualTo).propertyName);
        const propertySelectList = propertyCol.querySelector('select');
        const propertyType: PropertyTypes = propertySelectList.options[propertySelectList.selectedIndex].dataset.gifwFilterPropType as PropertyTypes;
        const operatorCol = this.createOperatorColumnNode(propertyType,filterType.friendlyName);

        const valuesCol = document.createElement('div');
        valuesCol.className = "col-5 valuesEditor";

        const deleteCol = this.createDeleteButton();

        filterRow.appendChild(propertyCol);
        filterRow.appendChild(operatorCol);
        filterRow.appendChild(valuesCol);
        filterRow.appendChild(deleteCol);

        return filterRow;
    }

    /**
     * Creates the HTML element containing the select list for a property
     * @param selectedPropertyName Optional - The name of the selected property
     */
    private createPropertyColumnNode(selectedPropertyName?: string) {
        const propertyCol = document.createElement('div');
        propertyCol.className = "col-3 propertySelector";
        const propertySelectList = this.createPropertySelectList(selectedPropertyName);
        propertyCol.appendChild(propertySelectList);
        return propertyCol;
    }

    /**
     * Creates the HTML select element for a property
     * @param selectedPropertyName Optional - The name of the selected property
     */
    private createPropertySelectList(selectedPropertyName?: string) {
        const propertySelectList = document.createElement('select');
        const propertyOptions: HTMLOptionElement[] = [];


        this.layerProperties.filter(f => f.type.indexOf("gml:") === -1).forEach(prop => {
            const option = document.createElement('option');
            option.value = prop.name;
            option.text = prop.name;
            option.dataset.gifwFilterPropType = prop.localType;
            if (selectedPropertyName === prop.name) {
                option.selected = true;
            }
            propertyOptions.push(option);
        })

        propertySelectList.append(...propertyOptions);
        propertySelectList.className = "form-select";
        
        propertySelectList.addEventListener('change', () => {
            this.updateOperatorsSelectList(propertySelectList);
        })
        return propertySelectList;
    }

    /**
     * Updates an existing operators select list based on the selected property
     * @param propertySelectList The property select list that is linked to the operator
     */
    private updateOperatorsSelectList(propertySelectList: HTMLSelectElement) {
        const propertyType:PropertyTypes = propertySelectList.options[propertySelectList.selectedIndex].dataset.gifwFilterPropType as PropertyTypes;
        const filterRow = propertySelectList.closest('.row');
        const operatorsSelectList:HTMLSelectElement = filterRow.querySelector('.filterOperator select');
        const updatedSelectList = this.createOperatorSelectList(propertyType, operatorsSelectList.options[operatorsSelectList.selectedIndex].value);
        operatorsSelectList.replaceWith(updatedSelectList);
        this.updateValuesEditor(updatedSelectList);

    }

    /**
     * Creates the HTML element containing the select list for an operator
     * @param propertyType The local definition of the Property Type
     * @param selectedOperatorName Optional - The operator that should be selected
     */
    private createOperatorColumnNode(propertyType: PropertyTypes, selectedOperatorName?: string) {
        const operatorCol = document.createElement('div');
        operatorCol.className = "col-3 filterOperator";
        
        operatorCol.appendChild(this.createOperatorSelectList(propertyType, selectedOperatorName))
        return operatorCol;
    }

    /**
     * Creates the HTML select element for an operator
     * @param propertyType The local definition of the Property Type
     * @param selectedOperatorName Optional - The operator that should be selected
     */
    private createOperatorSelectList(propertyType: PropertyTypes, selectedOperatorName?: string) {
        const operatorSelectList = document.createElement('select');
        const operatorOptions: HTMLOptionElement[] = [];

        let allowedOperators = this.cqlFormatter.filterTypes.filter(f => f.allowedPropertyTypes.includes(propertyType));
        if (allowedOperators.length === 0) {
            //revert to text
            allowedOperators = this.cqlFormatter.filterTypes.filter(f => f.allowedPropertyTypes.includes("string"));
        }
        allowedOperators.forEach(operator => {
            const option = document.createElement('option');
            option.value = operator.cqlTag;
            option.text = operator.friendlyName;
            if (selectedOperatorName === operator.friendlyName) {
                option.selected = true;
            }
            operatorOptions.push(option);
        })
        operatorSelectList.append(...operatorOptions);
        operatorSelectList.className = "form-select";
        operatorSelectList.addEventListener('change', () => {
            this.updateValuesEditor(operatorSelectList);
        })
        return operatorSelectList;
    }

    /**
     * Creates the HTML element containing the values editors for a filter
     * @param filterType{FilterType} The local definition of the type of filter
     * @param filter{Filter} Optional - The OpenLayers filter
     * @param propertyType{PropertyTypes} Optional - The local definition of the Property Type
     */
    private createValuesEditorNode(filterType: FilterType, filter?: Filter, propertyType?: PropertyTypes) {
        const valuesCol = document.createElement('div');
        valuesCol.className = "col-5 valuesEditor";
        valuesCol.appendChild(this.createValuesEditor(filterType, filter, propertyType));

        return valuesCol;
    }

    /**
     * Creates the inputs for the values editor of a filter
     * @param filterType{FilterType} The local definition of the type of filter
     * @param filter{Filter} Optional - The OpenLayers filter
     * @param propertyType{PropertyTypes} Optional - The local definition of the Property Type
     */
    private createValuesEditor(filterType: FilterType, filter?: Filter, propertyType?: PropertyTypes) {
        let returnEle: HTMLElement;
        const datalistId = uuidv4();
        switch (filterType.type) {
            case "singleValue":
                returnEle = this.createSingleValueEditor(filter, propertyType, filterType, datalistId);
                break;
            case "twoValue":
                returnEle = this.createTwoValueEditor(filter, propertyType, datalistId);
                break;
            case "nullValue":
                returnEle = document.createElement('div'); //intentionally blank
                break;
        }
        const datalist = document.createElement('datalist');
        datalist.id = datalistId;
        returnEle.appendChild(datalist);
        return returnEle;
    }

    /**
     * Updates the values editor linked to an operator
     * @param operatorSelectList{HTMLSelectElement} The operator select list whose linked values editor we want to update
     */
    private updateValuesEditor(operatorSelectList: HTMLSelectElement) {
        const operator = operatorSelectList.options[operatorSelectList.selectedIndex].value;
        const valuesRow = operatorSelectList.closest('.row');
        const valuesEditor: HTMLElement = valuesRow.querySelector('.valuesEditor');
        const existingValue = valuesEditor.querySelector('input')?.value;

        const propertySelectList: HTMLSelectElement = valuesRow.querySelector('.propertySelector select');
        const propertyType = propertySelectList.options[propertySelectList.selectedIndex].dataset.gifwFilterPropType as PropertyTypes;
        const updatedValuesEditor = this.createValuesEditor(this.cqlFormatter.filterTypes.filter(f => f.cqlTag === operator)[0], undefined, propertyType);
        let updatedValuesEditorPrimaryInput = updatedValuesEditor;
        if (updatedValuesEditorPrimaryInput.tagName.toLowerCase() !== "input") {
            updatedValuesEditorPrimaryInput = updatedValuesEditorPrimaryInput.querySelector('input');
        }

        if (existingValue && updatedValuesEditorPrimaryInput) {
            //attempt to coerce value into input
            switch ((updatedValuesEditorPrimaryInput as HTMLInputElement).type) {
                case "number":
                    //can we convert the value to a number
                    if (!isNaN(existingValue as unknown as number)) {
                        (updatedValuesEditorPrimaryInput as HTMLInputElement).value = existingValue;
                    }
                    break;
                case "date":
                    //TODO - can the value be coerced into a date?
                    break;
                default:
                    //anything can go in a string
                    (updatedValuesEditorPrimaryInput as HTMLInputElement).value = existingValue;
            }
        }

        valuesEditor.replaceChildren(updatedValuesEditor);

        const filterRow:HTMLElement = valuesRow.closest('.gifw-filter');
        this.updateSuggestionsListForFilter(filterRow);
    }

    /**
     * Creates the HTML and event listeners for the delete filter row button
     * */
    private createDeleteButton() {
        const deleteContainer = document.createElement('div');
        deleteContainer.className = "col-1 deleteButton";

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = "btn btn-outline-danger";
        deleteButton.innerHTML = `<i class="bi bi-trash"></i>`;
        deleteButton.addEventListener('click', e => {
            const valuesRow = (e.currentTarget as HTMLElement).closest('.row');
            valuesRow.remove();
            //is this a child group
            const parentSection = valuesRow.closest('.gifw-child-filter-section');
            if (parentSection) {
                //if yes, is this last values row
                const remainingRows = parentSection.querySelectorAll('.gifw-filter');
                if (remainingRows.length === 0) {
                    //delete the entire group
                    parentSection.remove();
                }
            }
        })

        deleteContainer.appendChild(deleteButton);

        return deleteContainer;
    }

    /**
     * Creates the HTML for a wrapping condition (any,all,none)
     * @param filter{Filter} Optional - The OpenLayers filter
     */
    private createConditionWrapper(filter?: Filter) {

        const logicalContainer = document.createElement('div');
        logicalContainer.className = `col border border-0 p-2 m-2 rounded`;

        const logicOperatorsRow = document.createElement('div');
        logicOperatorsRow.className = "row logicSelector";

        const logicOperatorsSelectList = document.createElement('select');
        logicOperatorsSelectList.className = "form-control-select form-control-sm";
        const logicOperatorsOptions: HTMLOptionElement[] = [];
        const operators = this.cqlFormatter.filterTypes.filter(f => f.type === "logical" || f.type === "negation");
        operators.forEach(operator => {
            const opt = document.createElement('option');
            opt.value = operator.tagName;
            opt.text = operator.friendlyName;
            if (filter) {
                if (operator.tagName === filter.getTagName()) {
                    opt.selected = true;
                }
            }
            logicOperatorsOptions.push(opt);
        })
        logicOperatorsSelectList.append(...logicOperatorsOptions);

        const logicOperatorsParagraph = document.createElement('p');
        const startText = document.createElement('span');
        startText.innerText = "Match ";
        const endText = document.createElement('span');
        endText.innerText = " of the following conditions:";
        logicOperatorsParagraph.appendChild(startText);
        logicOperatorsParagraph.appendChild(logicOperatorsSelectList);
        logicOperatorsParagraph.appendChild(endText);

        logicOperatorsRow.appendChild(logicOperatorsParagraph);

        logicalContainer.appendChild(logicOperatorsRow);

        return logicalContainer;
    }

    /**
     * Creates the HTML and event listeners for an Add Condition button
     * */
    private createAddConditionButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = "gifw-filter-action";
        const button = document.createElement('button');
        button.type = "button";
        button.className = "btn btn-sm btn-outline-dark me-2";
        button.innerHTML = `<span class="bi bi-plus-circle"></span> Add condition`;
        button.addEventListener('click', e => {
            const newCondition = this.createEmptyFilterRow();
            (e.currentTarget as HTMLElement).parentElement.insertBefore(newCondition, e.currentTarget as HTMLElement);
        })
        return button;
    }

    /**
     * Creates the HTML and event listeners for an Add Group button
     * */
    private createAddGroupButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = "gifw-filter-action";
        const button = document.createElement('button');
        button.type = "button";
        button.className = "btn btn-sm btn-outline-dark";
        button.innerHTML = `<span class="bi bi-view-list"></span> Add group`;
        button.addEventListener('click', e => {
            const newSection = this.createEmptyFilterHTML(true);
            (e.currentTarget as HTMLElement).parentElement.insertBefore(newSection, e.currentTarget as HTMLElement);
        })
        return button;
    }

    /**
     * Validates the filters as currently shown in the dialog
     * Only does basic validation on whether a value exists, is in a valid range and is a valid type
     * */
    private validateFilter(): boolean {
        //loop through filters and make sure there is a value
        //everywhere there should be and that it is valid
        let valid = true;
        const filterRows = document.querySelectorAll('.gifw-filter');
        filterRows.forEach(filterRow => {
            const filter = this.getFilterByRow(filterRow);
            const filterType = this.cqlFormatter.filterTypes.find(f => f.tagName === filter.getTagName());
            const invalidFeedbackEle = filterRow.querySelector('.valuesEditor .invalid-feedback');
            if (invalidFeedbackEle) {
                invalidFeedbackEle.remove();
            }
            filterRow.querySelector('.valuesEditor input').classList.remove('is-invalid');

            switch (filterType.type) {
                case "singleValue":
                    {
                        let expression;
                        if (filter instanceof IsLike) {
                            expression = filter.pattern;
                        } else {
                            expression = (filter as EqualTo).expression;
                        }
                        if (expression === "") {
                            this.markRowAsInvalid(filterRow, "This field needs a value")
                            valid = false;
                        }
                        break;
                    }
                case "twoValue":
                    {
                        //determine if its a date so we can do date comparison if necessary
                        const propertySelector: HTMLSelectElement = filterRow.querySelector('.propertySelector select');
                        const propType = propertySelector.selectedOptions[0].dataset.gifwFilterPropType as PropertyTypes;

                        if ((filter as IsBetween).upperBoundary.toString() === "" || (filter as IsBetween).lowerBoundary.toString() === "") {
                            this.markRowAsInvalid(filterRow, "Both fields need a value")
                            valid = false;
                        } else if (propType === "date-time" || propType === "date") {
                            const upperBoundaryAsDate = new Date((filter as IsBetween).upperBoundary);
                            const lowerBoundaryAsDate = new Date((filter as IsBetween).lowerBoundary)
                            if (lowerBoundaryAsDate >= upperBoundaryAsDate) {
                                this.markRowAsInvalid(filterRow, "Left hand date must be less than right hand date");
                                valid = false;
                            }
                        } else if ((filter as IsBetween).upperBoundary <= (filter as IsBetween).lowerBoundary) {
                            this.markRowAsInvalid(filterRow, "Left hand value must be less than right hand value");
                            valid = false;
                        }
                        break;
                    }
            }
        });
        
        return valid;
    }

    /**
     * Updates a filter row styling to show it as invalid
     * @param row{Element} The row to mark as invalid
     * @param message{string} The error message to show
     */
    private markRowAsInvalid(row:Element, message: string): void {
        const invalidHtml = document.createElement('div');
        invalidHtml.className = "invalid-feedback";
        invalidHtml.innerText = message;
        row.querySelector('.valuesEditor input').insertAdjacentElement('afterend', invalidHtml);
        row.querySelector('.valuesEditor input').classList.add('is-invalid');
        row.querySelectorAll('.valuesEditor input').forEach(input => {
            input.addEventListener('input', e => {
                /*remove validation error on change to avoid confusion*/
                /*TODO - Ideally this would continuously check the validation rather 
                 * than wait for them to press apply, and would plug properly into 
                 * the validation system*/
                const invalidFeedbackEle = (e.currentTarget as Element).closest('.valuesEditor').querySelector('.invalid-feedback');
                if (invalidFeedbackEle) {
                    invalidFeedbackEle.remove();
                }
                (e.currentTarget as Element).closest('.valuesEditor').querySelectorAll('.is-invalid').forEach(input => {
                    input.classList.remove('is-invalid');
                });
            }, { once: true });
        });
    }

    /**
     * Applies the filter as currently shown in the dialog and closes the dialog
     * Note that validateFilter() should be run before this to check it passes basic validation
     * */
    private applyFilter() {
        //get filter rows
        const filterGroup = document.querySelector('.gifw-parent-filter-section');

        //what type of logic filter is this?
        const logicSelector:HTMLSelectElement = filterGroup.querySelector('.logicSelector select');
        const logicTypeValue = logicSelector.selectedOptions[0].value;
        const logicType = this.cqlFormatter.filterTypes.filter(f => f.tagName === logicTypeValue)[0];
        let topLevelFilter: Filter;

        const filterGroups = filterGroup.querySelectorAll('.gifw-child-filter-section');

        //TODO - This is nasty, needs the DOM to be a bit cleaner and this will be easier to do
        const directChildFilters = filterGroup.querySelector('.row > .col').querySelectorAll(':scope > .gifw-filter')

        const groupFilters: Filter[] = [];

        directChildFilters.forEach(filterRow => {
            const filter = this.getFilterByRow(filterRow);
            groupFilters.push(filter);
        })
        if (groupFilters.length === 0) {
            //no filters
        }else if (groupFilters.length === 1) {
            topLevelFilter = groupFilters[0];
        } else {
            switch (logicType.tagName) {
                case "And":
                    topLevelFilter = new And(...groupFilters);
                    break;
                case "Or":
                    topLevelFilter = new Or(...groupFilters);
                    break;
                case "Not":
                    {
                        const andFilter = new And(...groupFilters);
                        topLevelFilter = new Not(andFilter);
                    }
            }
        }
        //at this point, the top level filter either contains a single filter
        //or a logical. Next we're going to find all the child sections and
        //append them as a new condition (if its a logical) or turn the top level
        //filter into a logical and push it on the end
        filterGroups.forEach(filterGroup => {
            const logicSelector: HTMLSelectElement = filterGroup.querySelector('.logicSelector select');
            const logicTypeValue = logicSelector.selectedOptions[0].value;
            const logicType = this.cqlFormatter.filterTypes.filter(f => f.tagName === logicTypeValue)[0];

            const directChildFilters = filterGroup.querySelector('.row > .col').querySelectorAll(':scope > .gifw-filter')

            const groupFilters: Filter[] = [];

            directChildFilters.forEach(filterRow => {
                const filter = this.getFilterByRow(filterRow);
                groupFilters.push(filter);
            })

            if (groupFilters.length === 1) {
                if (topLevelFilter instanceof And || topLevelFilter instanceof Or) {
                    if (logicType.tagName === "Not") {
                        topLevelFilter.conditions.push(new Not(groupFilters[0]));
                    } else {
                        topLevelFilter.conditions.push(groupFilters[0]);
                    }
                } else {
                    groupFilters.unshift(topLevelFilter);
                    switch (logicType.tagName) {
                        case "And":
                            topLevelFilter = new And(...groupFilters);
                            break;
                        case "Or":
                            topLevelFilter = new Or(...groupFilters);
                            break;
                        case "Not":
                            {
                                const andFilter = new And(...groupFilters);
                                topLevelFilter = new Not(andFilter);
                            }
                    }
                }
            } else {
                switch (logicType.tagName) {
                    case "And":
                        if (topLevelFilter instanceof Not) {
                            ((topLevelFilter).condition as And).conditions.push(new And(...groupFilters));
                        } else {
                            (topLevelFilter as And).conditions.push(new And(...groupFilters));
                        }
                        break;
                    case "Or":
                        if (topLevelFilter instanceof Not){
                            ((topLevelFilter).condition as And).conditions.push(new Or(...groupFilters));
                        }else {
                            (topLevelFilter as And).conditions.push(new Or(...groupFilters));
                        }
                        break;
                    case "Not":
                        {
                            const andFilter = new And(...groupFilters);
                            const notFilter = new Not(andFilter);
                            (topLevelFilter as And).conditions.push(notFilter)
                        }
                }
            }
        });
        const source = (this.layer as olLayer).getSource();
        if (topLevelFilter) {
            let cqlFilter = this.cqlFormatter.write(topLevelFilter);
            (this.layer as olLayer).set('gifw-filter-applied', topLevelFilter);
            if (this.defaultFilter && !this.layerConfig.defaultFilterEditable) {
                //append the default filter to the front
                cqlFilter = `(${this.defaultFilter}) AND (${cqlFilter})`;
            }
            (source as TileWMS).updateParams({ "CQL_FILTER": cqlFilter });
        } else {
            (this.layer as olLayer).unset('gifw-filter-applied');
            let cqlFilter = null;
            if (this.defaultFilter && !this.layerConfig.defaultFilterEditable) {
                cqlFilter = this.defaultFilter;
            }
            (source as TileWMS).updateParams({ "CQL_FILTER": cqlFilter });
        }
        this.layersPanelInstance.updateLayerFilteredStatusIcon(this.layerConfig.id)
    }

    /**
     * Converts a single filter row into a single OpenLayers filter
     * @param filterRow{Element} The row element we want to convert
     * 
     * @returns{Filter}
     */
    private getFilterByRow(filterRow:Element) {
        const propertySelector: HTMLSelectElement = filterRow.querySelector('.propertySelector select');
        const propName = propertySelector.selectedOptions[0].value;
        const propType = propertySelector.selectedOptions[0].dataset.gifwFilterPropType as PropertyTypes;
        const operatorSelector: HTMLSelectElement = filterRow.querySelector('.filterOperator select');
        const operatorName = operatorSelector.selectedOptions[0].value;

        const filterType = this.getFilterTypeByCQLOperator(operatorName);
        let filter: Filter;

        switch (filterType.type) {
            case "singleValue":
                {
                    const valueInput: HTMLInputElement = filterRow.querySelector('.valuesEditor input');
                    const value = valueInput.value;
                    //you must pass a number to the GreaterThan/LessThan/Between operators
                    //but dates cannot be coerced into a number, so we abuse 'any' to allow
                    //type checking to succeed with both numbers and strings which are both valid
                    let coercedValue: string | number = value;
                    if (propType === "int" || propType === "number") {
                        coercedValue = Number(value);
                    }
                    switch (filterType.tagName) {
                        case "PropertyIsEqualTo":
                            filter = new EqualTo(propName, coercedValue);
                            break;
                        case "PropertyIsNotEqualTo":
                            filter = new NotEqualTo(propName, coercedValue);
                            break;
                        case "PropertyIsGreaterThan":
                            filter = new GreaterThan(propName, coercedValue as number);
                            break;
                        case "PropertyIsGreaterThanOrEqualTo":
                            filter = new GreaterThanOrEqualTo(propName, coercedValue as number);
                            break;
                        case "PropertyIsLessThan":
                            filter = new LessThan(propName, coercedValue as number);
                            break;
                        case "PropertyIsLessThanOrEqualTo":
                            filter = new LessThanOrEqualTo(propName, coercedValue as number);
                            break;
                        case "PropertyIsLike":
                            filter = new IsLike(propName, coercedValue as string, "*", ".");
                            break;
                    }
                    break;
                }
                case "twoValue":
                {
                    const valueInputs: NodeListOf<HTMLInputElement> = filterRow.querySelectorAll('.valuesEditor input');
                    const lowerBoundaryValue = valueInputs[0].value;
                    const upperBoundaryValue = valueInputs[1].value;
                    let coercedLowerBoundaryValue: string | number = lowerBoundaryValue;
                    let coercedUpperBoundaryValue: string | number = upperBoundaryValue;
                    if (propType === "int" || propType === "number") {
                        coercedLowerBoundaryValue = Number(lowerBoundaryValue);
                        coercedUpperBoundaryValue = Number(upperBoundaryValue);
                    }

                    filter = new IsBetween(propName, coercedLowerBoundaryValue as number, coercedUpperBoundaryValue as number);
                    break;
                }
            case "nullValue":
                filter = new IsNull(propName);
                break;
            case "negation":
                filter = new Not(filter);
                break;
            case "logical":
                if (filterType.tagName === "And") {
                    filter = new And(...(filter as And).conditions);
                } else {
                    filter = new Or(...(filter as Or).conditions);
                }
                break;
        }
        return filter;
    }

    /**
     * Takes a string based operator name and converts it to a local FilterType definition
     * @param operatorName{string} The CQL operator name
     */
    private getFilterTypeByCQLOperator(operatorName: string) {
        const filterType = this.cqlFormatter.filterTypes.filter(f => f.cqlTag === operatorName);
        if (filterType && filterType.length === 1) {
            return filterType[0];
        }
        return;
    }

    /**
     * Converts a text based CQL Filter to an OpenLayers filter
     * NOTE: This function has been copied and adapted from FeatureQuerySearch - Ideally it would be a shared function
     * @param cqlFilter{string} The CQL filter to convert
     * @param layer{olLayer} Optional - The OpenLayers layer that has the CQL filter
     */
    private convertTextFiltersToOLFilter(cqlFilter: string, layer?: olLayer): Filter {

        if (layer) {
            if (layer.get('gifw-filter-applied')) {
                return layer.get('gifw-filter-applied');
            }
        }

        if (cqlFilter) {
            return this.cqlFormatter.read(cqlFilter);
        }

        return;
    }

    /**
     * Extracts the CQL filter paramater (if it exists) from a generic object
     * @param params The paramaters object
     */
    private extractCQLFilterFromParams(params:Record<string, string>):string {
        let cqlFilter: string;
        for (const property in params) {
            if (property.toLowerCase() === 'cql_filter') {
                cqlFilter = params[property];
            }
        }
        return cqlFilter;
    }

    /**
     * Gets the property names and types for a layer
     * TODO: This is largely copied from the getSearchPromisesForLayers function in FeatureQuerySearch
     * This should be made reusable
     * @returns{Property[]}
     * */
    private async getPropertiesForLayer() {
        const source = (this.layer as olLayer).getSource();
        if (source instanceof TileWMS || source instanceof ImageWMS) {
            //get feature type description and capabilities from server
            const sourceParams = source.getParams();
            const featureTypeName = sourceParams.LAYERS;
            let baseUrl: string;
            if (source instanceof TileWMS) {
                baseUrl = source.getUrls()[0];
            } else {
                baseUrl = (source as ImageWMS).getUrl();
            }

            const authKey = Util.Helper.getValueFromObjectByKey(sourceParams, "authkey");
            let additionalParams = {};
            if (authKey) {
                additionalParams = { authkey: authKey };
            }
            let proxyEndpoint = "";
            if (this.layerConfig.proxyMetaRequests) {
                proxyEndpoint = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}proxy`;
            }
            const layerHeaders = Util.Mapping.extractCustomHeadersFromLayerSource(this.layerConfig.layerSource);
            const serverCapabilities = await Metadata.getBasicCapabilities(baseUrl, additionalParams, proxyEndpoint, layerHeaders);

            if (serverCapabilities &&
                serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType && c.url !== '').length !== 0 &&
                serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WFS_GetFeature && c.url !== '').length !== 0
            ) {
                //has all relevant capabilities
                const describeFeatureCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.DescribeFeatureType)[0];
                const featureDescription = await Metadata.getDescribeFeatureType(describeFeatureCapability.url, featureTypeName, describeFeatureCapability.method, undefined, proxyEndpoint, undefined, layerHeaders);
                if (featureDescription && featureDescription.featureTypes.length === 1) {
                    return featureDescription.featureTypes[0].properties;
                }
            }
        }
    }

    /**
     * Gets the suggested values for a property name
     * 
     * @param propertyName The name of the property to get suggestions for
     * @returns Promise<string[]> Array of suggested values, or null
     * */
    private async getValueSuggestionsForProperty(propertyName: string): Promise<string[]> {

        if (this.useWPSSearchSuggestions) {
            //check the cache
            const cachedValues = this._uniquePropValuesCache.filter(c => c.propertyName === propertyName);
            if (cachedValues.length !== 0) {
                return cachedValues[0].values;
            }

            const source = (this.layer as olLayer).getSource();
            if (source instanceof TileWMS || source instanceof ImageWMS) {
                //get feature type description and capabilities from server
                const sourceParams = source.getParams();
                const featureTypeName = sourceParams.LAYERS;

                const xmlPayload = this.getWPSPagedUniquePayload(featureTypeName, propertyName);
                const baseUrl = this.wpsExecuteCapability.url;
                let searchParams = new URLSearchParams();
                const authKey = Util.Helper.getValueFromObjectByKey(sourceParams, "authkey") as string;
                if (authKey) {
                    searchParams = new URLSearchParams({ authkey: authKey });
                }

                let url = `${baseUrl}${baseUrl.indexOf('?') === -1 ? '?' : '&'}${searchParams}`;
                
                if (this.layerConfig.proxyMetaRequests) {
                    url = this.gifwMapInstance.createProxyURL(url);
                }
                const httpHeaders = Util.Mapping.extractCustomHeadersFromLayerSource(this.layerConfig.layerSource);
                const response = await fetch(url,
                    {
                        method: this.wpsExecuteCapability.method,
                        body: xmlPayload,
                        headers: httpHeaders
                    }
                );
                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }
                const uniqueValues: PagedUniqueResponse = await response.json();
                if (uniqueValues.size <= 100) {
                    //add to cache
                    this._uniquePropValuesCache.push({ propertyName: propertyName, values: uniqueValues.values.sort() });
                    return uniqueValues.values.sort();
                }
            }
            return null;
        }
    }

    /**
     * Updates the suggestions datalist for a particular filter row
     * 
     * @param filterRow {HTMLElement} The filter row to update the datalist for
     * */
    private async updateSuggestionsListForFilter(filterRow: HTMLElement) {
        const propertyName = this.getSelectedPropertyNameForRow(filterRow)
        const suggestions = await this.getValueSuggestionsForProperty(propertyName);
        const datalist = filterRow.querySelector('datalist');
        let opts = '';
        suggestions?.forEach(suggestion => {
            opts += `<option value="${suggestion}"></option>`;
        })
        datalist.innerHTML = opts;
    }

    /**
     * Gets the currently selected property name from a filter row
     * 
     * @param filterRow {HTMLElement} The filter row to get the property name from
     * @returns{string}
     * */
    private getSelectedPropertyNameForRow(filterRow: Element): string {
        return (filterRow.querySelector('.propertySelector select') as HTMLSelectElement).selectedOptions[0].value;
    }

    /**
     * Initializes the property value suggestions system by checking if
     * the source has the apporiate WPS process to get unique values and sets
     * class variables indicating if its available
     * */
    private async initPropertyValueSuggestions(): Promise<void> {
        const source = (this.layer as olLayer).getSource();
        if (source instanceof TileWMS || source instanceof ImageWMS) {
            //get feature type description and capabilities from server
            let baseUrl: string;
            if (source instanceof TileWMS) {
                baseUrl = source.getUrls()[0];
            } else {
                baseUrl = (source as ImageWMS).getUrl();
            }
            let proxyEndpoint = "";
            if (this.layerConfig.proxyMetaRequests) {
                proxyEndpoint = `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}proxy`;
            }
            const httpHeaders = Util.Mapping.extractCustomHeadersFromLayerSource(this.layerConfig.layerSource);
            const serverCapabilities = await Metadata.getWPSCapabilities(baseUrl, proxyEndpoint, {}, httpHeaders);

            if (serverCapabilities &&
                serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WPS_DescribeProcess && c.url !== '').length !== 0 &&
                serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WPS_Execute && c.url !== '').length !== 0
            ) {
                //has all relevant capabilities
                const describeProcessCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WPS_DescribeProcess)[0];
                
                const hasPagedUniqueProcess = await Metadata.hasWPSProcess(describeProcessCapability.url,
                                                                        describeProcessCapability.method,
                                                                        'gs:PagedUnique',
                                                                        proxyEndpoint,
                                                                        {},
                                                                        httpHeaders
                                                                        );
                if (hasPagedUniqueProcess) {
                    //set flag
                    this.useWPSSearchSuggestions = true;
                    //store Execute information
                    this.wpsExecuteCapability = serverCapabilities.capabilities.filter(c => c.type === CapabilityType.WPS_Execute)[0]
                }
            }
        }
    }

    private getWPSPagedUniquePayload(typeName:string,propertyName:string): string {

        return `<?xml version="1.0" encoding="UTF-8"?><wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
  <ows:Identifier>gs:PagedUnique</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>features</ows:Identifier>
      <wps:Reference mimeType="text/xml" xlink:href="http://geoserver/wfs" method="POST">
        <wps:Body>
          <wfs:GetFeature service="WFS" version="1.0.0">
            <wfs:Query typeName="${typeName}"/>
          </wfs:GetFeature>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>fieldName</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>${propertyName}</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>maxFeatures</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>100</wps:LiteralData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="application/json">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>`;
    } 


}

interface PropertyValuesCache {
    propertyName: string;
    values: string[];
}

