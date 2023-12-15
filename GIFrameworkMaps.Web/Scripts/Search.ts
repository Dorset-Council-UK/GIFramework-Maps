import * as olExtent from 'ol/extent';
import * as olProj from "ol/proj";
import { Modal } from 'bootstrap';
import { Util } from "./Util";
import Feature from 'ol/Feature';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import Point from 'ol/geom/Point';
import { Fill, Stroke,Icon, Style } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import { GIFWMap } from "./Map";
import { SearchResult, SearchResultCategory, SearchResults } from './Interfaces/Search/Search'
import { GIFWPopupOptions } from './Popups/PopupOptions';
import { GIFWPopupAction } from './Popups/PopupAction';
import { SearchQuery } from './Interfaces/Search/SearchQuery';
import { RequiredSearch } from './Interfaces/Search/RequiredSearch';
import { LayerGroupType } from './Interfaces/LayerGroupType';
import { UserSettings } from './UserSettings';

export class Search {

    container: string;
    gifwMapInstance: GIFWMap;
    searchEndpointURL: string;
    searchOptionsURL: string;
    searchBoxHTML: string = `
        <div class="ol-unselectable ol-control gifw-search-control">
            <button class="search-control-toggle d-md-none"><i class="bi bi-search"></i></button>
        </div>
        <div class="search-control d-none d-md-block">
            <form id="gifw-search-form">
                <div class="input-group">
                    <input type="search" class="form-control" placeholder="Enter a search" aria-label="Search" aria-describedby="gifw-search-button" required>
                    <button class="btn btn-outline-primary" type="submit" id="gifw-search-button">Search</button>
                    <button class="btn btn-outline-secondary" type="button" id="gifw-search-configure-button"><i class="bi-gear-fill"></i></button>
                </div>
            </form>
        </div>`;
    isOpen: Boolean = false;
    availableSearchDefs: RequiredSearch[];
    genericErrorMessage: string = 'There was an error getting your search results. The developers have been automatically informed. Please try again.';
    abortController: AbortController;
    timeLimit: number = 25000;
    isRunning: boolean = false;
    cancelledByUser: boolean = false;
    static mapLockedFromSearch: boolean = false;
    curSearchResultExtent: olExtent.Extent;
    curSearchResultMaxZoom: number;
    enableMultipleSearchResultsOnMap: boolean = false;
    _resultsLayer: VectorLayer<any>;
    _vectorSource: VectorSource<any>;
    _iconStyle: Style;
    _polyStyle: Style;
    _localStorageKey: string = 'enableMultipleSearchResultsOnMap';

    constructor(container: string, gifwMapInstance: GIFWMap, searchOptionsURL: string, searchEndpointURL:string) {
        this.container = container;
        this.gifwMapInstance = gifwMapInstance;
        this.searchOptionsURL = searchOptionsURL;
        this.searchEndpointURL = searchEndpointURL;
    }
    init(permalinkParams?: Record<string, string>) {
        //inject search box into document
        let container = document.querySelector(this.container);
        container.insertAdjacentHTML('beforeend', this.searchBoxHTML);
        //ajax call to get search opts
        
        fetch(this.searchOptionsURL).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json() as Promise<RequiredSearch[]>;
        }).then(data => {
            this.availableSearchDefs = data;
            this.bindSearchOptionsConfigurator();
        }).catch(error => {
            console.error("Failed to get search options", error);
            document.getElementById('search-container').style.display = 'none'
            let errDialog = new Util.Error(Util.AlertType.Popup, Util.AlertSeverity.Danger, "Error getting search options", "<p>There was an error getting the search definitions for this version</p><p>This means the search functionality will not work. Please refresh the page to try again</p>")
            errDialog.show();
        });
        //attach search toggle
        document.querySelector('.search-control-toggle').addEventListener('click', () => {
            this.showSearchControl();
        });
        document.querySelector('#giframeworkMapContainer .ol-viewport').addEventListener('pointerdown', () => {
            this.hideSearchControlIfResultsAreHidden();
        });
        //attach search button
        document.getElementById('gifw-search-form').addEventListener('submit', e => {
            this.handleSearch(e);
        });
        //attach config button
        document.getElementById('gifw-search-configure-button').addEventListener('click', e => {
            this.renderSearchOptionsModal();
            let searchConfiguratorModal = new Modal(document.getElementById('search-configurator-modal'), {});
            searchConfiguratorModal.show();
        })
        //attach close button
        let closeButton = document.querySelector('#gifw-search-results button[data-gifw-dismiss-sidebar]');
        if (closeButton !== null) {
            closeButton.addEventListener('click', (e) => {
                this.close();
                this.hideSearchControl();
            });
        }
        //get multiple search results preference
        if (UserSettings.getItem(this._localStorageKey) === 'true') {
            this.enableMultipleSearchResultsOnMap = true;
        }
        
        //add event listener for closure
        document.getElementById(this.gifwMapInstance.id).addEventListener(
            'gifw-search-sidebar-close',
            () => {
                if (Search.mapLockedFromSearch) {
                    this.recenterMapOnSearchResult();
                }
            }
        )
        //add search results layer

        this.initStyles();

        this._vectorSource = new VectorSource();

        this._resultsLayer = this.gifwMapInstance.addNativeLayerToMap(this._vectorSource, "Search results", undefined, false, LayerGroupType.SystemNative, undefined, undefined, "__searchresults__");
        this._resultsLayer.on('change', e => {
            if ((this._resultsLayer.getSource() as VectorSource<any>).getFeatures().length === 0) {
                this._resultsLayer.setVisible(false);
            } else {
                this._resultsLayer.setVisible(true);
            }

        });

        //add the permalink provided search results pin if provided
        if (permalinkParams && permalinkParams.sr && permalinkParams.srdata) {
            try {
                let decodedSearchResultData = Util.Helper.UnicodeDecodeB64(permalinkParams.srdata);
                let searchResultData = JSON.parse(decodedSearchResultData);
                let searchResultCoords = permalinkParams.sr.split(',');
                if (searchResultData && searchResultData.content && searchResultData.title && searchResultCoords.length === 2) {
                    let resultIcon = new Feature({
                        geometry: new Point([parseFloat(searchResultCoords[0]), parseFloat(searchResultCoords[1])]),
                        name: searchResultData.title
                    });
                    this.drawSearchResultFeatureOnMap(resultIcon, searchResultData.content, searchResultData.title, this._iconStyle);
                }
            } catch (e: any) {
                console.error('Could not decode permalink param', e);
            }
        }
    }

    private showSearchControl() {
        document.querySelectorAll<HTMLDivElement>('.sidebar').forEach((bar) => {
            bar.style.display = 'none';
        });
        document.querySelectorAll<HTMLButtonElement>('.sidebar-button').forEach((button) => {
            button.classList.remove('active');
            button.classList.remove('sidebar-open');
        });
        document.querySelector('.search-control').classList.remove('d-none');
        document.querySelector('.search-control-toggle').classList.add('d-none');
    }

    private hideSearchControl() {
        document.querySelector('.search-control').classList.add('d-none');
        document.querySelector('.search-control-toggle').classList.remove('d-none');
    }

    private hideSearchControlIfResultsAreHidden() {
        const searchResultsPane = document.querySelector('#gifw-search-results') as HTMLDivElement;
        if (searchResultsPane.style.display == "none") {
            this.hideSearchControl();
        }
    }

    private handleSearch(event: Event): void {

        let searchTermInput: HTMLInputElement = document.querySelector('#gifw-search-form input[type=search]');
        if (searchTermInput !== null) {
            let searchTerm = searchTermInput.value.trim();

            if (searchTerm.length !== 0) {
                if (!this.isOpen) {
                    this.open();
                };
                this.showLoading();

                new Promise((resolve, reject) => {
                    let results = this.doSearch(searchTerm);
                    resolve(results);
                }).then(result => {
                    this.renderSearchResults(result as SearchResults);
                }).catch(e => {
                    console.error(e);
                    this.showError();
                }).finally(() => {
                    this.hideLoading();
                    this.isRunning = false;
                    this.cancelledByUser = false;
                });

            }
        }
        event.preventDefault();
    }

    private cancelSearch() {
        this.cancelledByUser = true;
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
    * Takes a string search term and passes it to the set search provider URL
    *
    * @param searchTerm - The term used for the search
    * @returns SearchResults object containing results metadata and list of categorised results
    *
    */
    private doSearch(searchTerm:string):Promise<SearchResults> {

        let requiredSearches = this.availableSearchDefs.filter(d => { return d.enabled });
        
        let searchQuery: SearchQuery = {
            query: searchTerm,
            searches: requiredSearches
        };

        let promise = new Promise<SearchResults>((resolve, reject) =>{

            this.isRunning = true;
            this.abortController = new AbortController();
            let timer = setTimeout(() => this.abortController.abort(), this.timeLimit);

            fetch(`${this.searchEndpointURL}`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchQuery),
                signal: this.abortController.signal
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json() as Promise<SearchResults>;
                }).then(data => {
                    resolve(data);
                })
                .catch(error => {
                    if (this.cancelledByUser) {
                        console.warn('Search cancelled by user');
                        this.close();
                    } else {
                        this.showError();
                        let errorMessage: string;
                        if (error.name == 'AbortError') {
                            errorMessage = `The search was stopped as it exceeded the time limit of ${this.timeLimit / 1000} seconds\n`;
                        } else {
                            errorMessage = 'Failed to get search results';
                        }
                        console.error(errorMessage, error);
                    }
                })
                .finally(() => {
                    this.hideLoading();
                    this.isRunning = false;
                    this.cancelledByUser = false;
                    clearTimeout(timer);
                });        
        })

        return promise;
        
    }

    /**
    * Takes a set of search results and renders them in the results panel
    *
    * @param searchResults - The SearchResults object containing results metadata and list of categorised results
    * @returns void
    *
    */
    private renderSearchResults(searchResults: SearchResults) {
        (document.querySelector('#gifw-search-results-count') as HTMLHeadElement).innerText = `${searchResults.totalResults} results found`;
        let searchResultsContainer = document.querySelector('#gifw-search-results-list');
        //clear the existing container
        searchResultsContainer.innerHTML = '';

        if (searchResults.isError) {
            if (searchResults.totalResults !== 0) {
                this.showError('Some searches returned an error, so your results may be incomplete');
            } else {
                this.showError();
            }
        }
        

        let sortedCategories = searchResults.resultCategories.sort((a, b) => a.ordering - b.ordering);
        sortedCategories.forEach(c => {
            if (c.results.length !== 0) {
                searchResultsContainer.insertAdjacentHTML('beforeend', `<h6>${c.categoryName}</h6>`);
                let sortedResults = c.results.sort((a, b) => a.ordering - b.ordering);
                let listEle = document.createElement('ul');
                listEle.className = 'list-unstyled';
                sortedResults.forEach(r => {
                    let listItem = document.createElement('li');
                    let resultItem = document.createElement('a');
                    resultItem.href = "#";
                    resultItem.innerText = r.displayText;
                    resultItem.addEventListener('click', e => {
                        e.preventDefault();
                        if (!this.enableMultipleSearchResultsOnMap) {
                            this.removeSearchResultsFromMap();
                        }
                        this.zoomToResult(r);
                        if (!c.supressGeom) {
                            this.drawResultOnMap(r, c);
                        }
                    })
                    listItem.appendChild(resultItem);
                    listEle.appendChild(listItem);
                });
                searchResultsContainer.appendChild(listEle);
                if (c.attributionHtml) {
                    searchResultsContainer.insertAdjacentHTML('beforeend', `<small class="text-muted">${c.attributionHtml}</small>`);
                }
            }
        });
        
        
    }

    /**
    * Takes a single search result and zooms the map to it
    *
    * @param result - A single SearchResult
    * @returns void
    *
    */
    private zoomToResult(result: SearchResult) {
        let sourceProj = olProj.get(`EPSG:${result.epsg}`);
        let targetProj = this.gifwMapInstance.olMap.getView().getProjection();
        let closeOnRender = false;
        if (this.gifwMapInstance.getPercentOfMapCoveredWithOverlays() > 50) {
            closeOnRender = true;
        }

        //let curExtent = this.gifwMapInstance.olMap.getView().calculateExtent();
        let zoomToExtent: olExtent.Extent;
        let animationSpeed: number;
        let maxZoom: number;

        if (result.bbox !== undefined && result.bbox !== null) {
            //attempt to zoom to bounding box
            zoomToExtent = olProj.transformExtent(result.bbox, sourceProj, targetProj);

        } else if (result.geom) {
            let geoJson = new GeoJSON().readFeatures(JSON.parse(result.geom), {dataProjection:sourceProj,featureProjection:targetProj});
            zoomToExtent = geoJson[0].getGeometry().getExtent();
            geoJson.forEach(g => {
                olExtent.extend(zoomToExtent, g.getGeometry().getExtent());
            });
            maxZoom = result.zoom;

            
        } else {
            //zoom using x, y and zoom values
            let coord = [result.x, result.y];
            let convertedCoord = olProj.transform(coord, sourceProj, targetProj);
            let point = new Point(convertedCoord);
            let curZoom = this.gifwMapInstance.olMap.getView().getZoom();
            let zoomDiff = Math.max(result.zoom, curZoom) - Math.min(result.zoom, curZoom);

            zoomToExtent = point.getExtent();
            animationSpeed = Util.Mapping.calculateAnimationSpeed(zoomDiff);
            maxZoom = result.zoom;
        }


        if (this.gifwMapInstance.isExtentAvailableInCurrentMap(zoomToExtent)) {
            this.gifwMapInstance.fitMapToExtent(zoomToExtent, maxZoom, animationSpeed);
            this.curSearchResultExtent = zoomToExtent;
            this.curSearchResultMaxZoom = maxZoom;
            if (closeOnRender) {
                this.close();
                this.hideSearchControl();
                this.unlockMap();
            } else {
                this.gifwMapInstance.olMap.un('movestart', this.unlockMap)
                this.lockMap();

                /*Small timeout added to prevent previous fitMapToExtent animation from triggering this*/
                window.setTimeout(() => {
                    this.gifwMapInstance.olMap.once('movestart', this.unlockMap)
                },500)
                
            }
        } else {
            this.showSearchOutsideBoundsError();
        }
    }

    private unlockMap(): void {
        Search.mapLockedFromSearch = false;
    }

    private lockMap(): void {
        Search.mapLockedFromSearch = true;
    }

    private recenterMapOnSearchResult(): void {
        this.gifwMapInstance.fitMapToExtent(this.curSearchResultExtent, this.curSearchResultMaxZoom, 250)
    }

    private showSearchOutsideBoundsError(): void {
        let errDialog = new Util.Error
            (
                Util.AlertType.Popup,
                Util.AlertSeverity.Danger,
                "Search result is outside bounds of map",
                "<p>The search result you selected is outside the current max bounds of your background map.</p><p>Choose a different background map to view this result.</p>"
            )
        errDialog.show();
    }

    private drawResultOnMap(result: SearchResult, category: SearchResultCategory) {

        if (result.geom) {
            let geoJson = new GeoJSON().readFeatures(JSON.parse(result.geom));
            
            geoJson.forEach(g => {
                (g as Feature).set('name', result.displayText);

                let popupContent = `<h1>${category.categoryName}</h1><p>${result.displayText}</p>`;
                let popupTitle = `${result.displayText} (${category.categoryName})`;

                this.drawSearchResultFeatureOnMap((g as Feature),popupContent,popupTitle, this._polyStyle,result.epsg)
            })
        } else if(result.x && result.y) {            
            let resultIcon = new Feature({
                geometry: new Point([result.x, result.y]),
                name: result.displayText
            });

            let popupContent = `<h1>${category.categoryName}</h1><p>${result.displayText}</p>`;
            
            let popupTitle = `${result.displayText} (${category.categoryName})`;

            this.drawSearchResultFeatureOnMap(resultIcon, popupContent, popupTitle,this._iconStyle, result.epsg)
        }
    }

    private drawSearchResultFeatureOnMap(feature: Feature, popupContent: string | Element, popupTitle: string, style: Style, epsg:number = 3857) {
        let removeAction = new GIFWPopupAction("Remove search result", () => {
            this.removeSearchResultFromMap(feature);
        }, true, true);

        let removeAllAction = new GIFWPopupAction("Remove all search results", () => {
            this.removeSearchResultsFromMap();
        }, true, true);

        let popupOpts = new GIFWPopupOptions(popupContent, [removeAction, removeAllAction]);

        feature.set('gifw-popup-opts', popupOpts);
        feature.set('gifw-popup-title', popupTitle);

        feature.setStyle(style);
        let sourceProj = olProj.get(`EPSG:${epsg}`);
        let targetProj = this.gifwMapInstance.olMap.getView().getProjection();
        feature.getGeometry().transform(sourceProj, targetProj);
        this._resultsLayer.getSource().addFeature(feature);
    }

    private removeSearchResultsFromMap(): void {
        this._resultsLayer.getSource().clear();
        document.getElementById(this.gifwMapInstance.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
    }

    private removeSearchResultFromMap(feature: Feature): void {
        this._resultsLayer.getSource().removeFeature(feature);
        document.getElementById(this.gifwMapInstance.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
    }

    /**
    * Shows the loading spinner in the search results panel
    *
    * @returns void
    *
    */
    private showLoading() {
        let searchResults = document.getElementById('gifw-search-results-list');
        searchResults.innerHTML = '';
        (document.querySelector('#gifw-search-results-count') as HTMLHeadElement).innerText = '';
        Util.Helper.addLoadingOverlayToElement(searchResults, 'afterbegin');
        (document.getElementById('gifw-search-button') as HTMLButtonElement).disabled = true;
        searchResults.addEventListener('gifw-cancel', () => { this.cancelSearch(); });
    }

    /**
    * Hides the loading spinner in the search results panel
    *
    * @returns void
    *
    */
    private hideLoading() {
        let searchResults = document.getElementById('gifw-search-results-list');
        Util.Helper.removeLoadingOverlayFromElement(searchResults);
        (document.getElementById('gifw-search-button') as HTMLButtonElement).disabled = false;
    }

    /**
     * Shows an error in the search results panel
     * 
     * @returns void
     * 
     * */
    private showError(errorMessage?:string): void {
        let searchResultsContainer = document.querySelector('#gifw-search-results-list');
        
        searchResultsContainer.innerHTML = `<div class="alert alert-danger">${errorMessage !== undefined ? errorMessage : this.genericErrorMessage}</div>`;
    }

    /**
     * Renders the search options modal with the current availableSearchDefs
     * 
     * @returns void
     * 
     */
    private renderSearchOptionsModal():void {
        if (this.availableSearchDefs !== null) {
            let searchDefsForm = document.getElementById('gifw-search-configurator-form');
            let tableBody = searchDefsForm.querySelector('table tbody');
            tableBody.innerHTML = '';
            this.availableSearchDefs.sort((a, b) => { return a.order - b.order }).forEach(def => {
                let row = `<tr>
                            <td>${def.name}</td>
                            <td>
                                <label class="visually-hidden" for="Enabled_${def.searchDefinitionId}">Enable/Disable ${def.name}</label>
                                <input type="checkbox" class="form-check-input" name="Enabled_${def.searchDefinitionId}" ${def.enabled ? "checked" : ""} data-gifw-search-def-id="${def.searchDefinitionId}"/></td>
                            <td>
                                <label class="visually-hidden" for="StopIfFound_${def.searchDefinitionId}">Set search to stop if ${def.name} is found</label>
                                <input type="checkbox" class="form-check-input" name="StopIfFound_${def.searchDefinitionId}"${def.stopIfFound ? "checked" : ""} data-gifw-search-def-id="${def.searchDefinitionId}"/>
                            </td>
                           </tr>`;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
            (searchDefsForm.querySelector('#enableMultipleSearchResults') as HTMLInputElement).checked = this.enableMultipleSearchResultsOnMap;
        }
    }

    private bindSearchOptionsConfigurator(): void {
        let searchDefsForm = document.getElementById('gifw-search-configurator-form');
        searchDefsForm.addEventListener('submit', e => {
            this.updateOptions(e);

            /**
             * A search button click event is preferred over a search form submit event here, as it triggers the client side form validation.
             * If the search input is empty, the user will be alerted to it and the search is not performed.
             **/
            const searchButton = document.querySelector('#gifw-search-button') as HTMLButtonElement;
            searchButton.click();

        });
        searchDefsForm.querySelector('button[name=UpdateOnly]').addEventListener('click', e => {
            this.updateOptions(e);
        });
    }

    private updateOptions(event: Event): void {
        let searchDefsForm = document.getElementById('gifw-search-configurator-form');
        let enabledCheckboxes: NodeListOf<HTMLInputElement> = searchDefsForm.querySelectorAll('input[type=checkbox][name^=Enabled]');
        let stopIfFoundCheckboxes: NodeListOf<HTMLInputElement> = searchDefsForm.querySelectorAll('input[type=checkbox][name^=StopIfFound]');
        let enableMultipleSearchResultsCheckbox: HTMLInputElement = searchDefsForm.querySelector('#enableMultipleSearchResults')
        enabledCheckboxes.forEach(cb => {
            let searchDefID = cb.dataset.gifwSearchDefId;
            this.setEnabledSearchDef(parseInt(searchDefID), cb.checked);
        });

        stopIfFoundCheckboxes.forEach(cb => {
            let searchDefID = cb.dataset.gifwSearchDefId;
            this.setStopIfFoundSearchDef(parseInt(searchDefID), cb.checked);
        })

        this.enableMultipleSearchResultsOnMap = enableMultipleSearchResultsCheckbox.checked;
        UserSettings.setItem(this._localStorageKey, this.enableMultipleSearchResultsOnMap ? 'true' : 'false');

        let searchConfiguratorModal = Modal.getInstance(document.getElementById('search-configurator-modal'));
        searchConfiguratorModal.hide();
        event.preventDefault();
    }

    private setEnabledSearchDef(searchDefID: number, newState: boolean): void {
        /*TODO could do with some optimization so it doesn't loop through the whole array unnecessarily*/
        this.availableSearchDefs.forEach((def, index, arr) => {
            if (def.searchDefinitionId === searchDefID) {
                arr[index].enabled = newState;
            }
        })
    }

    private setStopIfFoundSearchDef(searchDefID: number, newState: boolean): void {
        /*TODO could do with some optimization so it doesn't loop through the whole array unnecessarily*/
        this.availableSearchDefs.forEach((def, index, arr) => {
            if (def.searchDefinitionId === searchDefID) {
                arr[index].stopIfFound = newState;
            }
        })
    }

    private initStyles(): void {
        let color = this.gifwMapInstance.config.theme.primaryColour;
        color = color.replace("#", "");
        this._iconStyle = new Style({
            image: new Icon({
                anchor: [0.5, 32], //50% from left, 32px (height of icon) up. Pins the tail of the icon to the right location, rather than the center
                anchorXUnits: "fraction",
                anchorYUnits: "pixels",
                src: `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}api/svgicon/full?shape=marker&colour=${color}&border_colour=000000&label=&width=25&height=32`,
            }),
        });

        let rgbColor = Util.Color.hexToRgb(color);
        let strokeColor = 'rgb(0,0,0)';
        let fillColor = 'rgba(255, 255, 255, 0.2)';
        if (rgbColor) {
            strokeColor = `rgb(${rgbColor.r},${rgbColor.g},${rgbColor.b})`;
            fillColor = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`;
        }

        this._polyStyle = new Style({
            stroke: new Stroke({
                color: strokeColor,
                width: 3,
            }),
            fill: new Fill({
                color: fillColor,
            }),
        });

    }

    /**
    * Opens the search sidebar and closes any other in the same area
    *
    * @returns void
    *
    */
    open() {
        this.showSearchControl();
        var sidebarPanelsContainer = document.querySelector('#gifw-sidebar-left');
        var sidebar: HTMLDivElement = sidebarPanelsContainer.querySelector('#gifw-search-results');

        sidebarPanelsContainer.classList.toggle('show', true);

        var otherSidebars: NodeListOf<HTMLDivElement> = sidebarPanelsContainer.querySelectorAll('.sidebar');
        otherSidebars.forEach(function (sb) {
            sb.style.display = 'none';
        });

        sidebar.style.display = 'block';
        this.unlockMap();
    }

    /**
    * Closes the search sidebar and closes any other in the same area
    *
    * @returns void
    *
    */
    close() {
        Search.close();
        document.getElementById(this.gifwMapInstance.id).dispatchEvent(new CustomEvent('gifw-search-sidebar-close'));
    }

    static close() {
        var sidebarPanelsContainer = document.querySelector('#gifw-sidebar-left');
        sidebarPanelsContainer.classList.toggle('show', false);
    }
}