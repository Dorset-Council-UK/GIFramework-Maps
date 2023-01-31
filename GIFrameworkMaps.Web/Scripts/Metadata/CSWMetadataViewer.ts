import { Modal } from "bootstrap";
import Badge from "../Badge";
import { Layer } from "../Interfaces/Layer";
import { CSWMetadata, CSWMetadataLinks } from "../Interfaces/OGCMetadata/CSWMetadata";


export class CSWMetadataViewer {

    static getCSWMetadataForLayer(layer:Layer, proxyEndpoint: string = ""): Promise<CSWMetadata> {
        let CSWMetadataURL = layer.layerSource.layerSourceOptions.filter(l => l.name == "cswendpoint");
        if (CSWMetadataURL.length !== 0) {
            let CSWMetadataGetURL = new URL(CSWMetadataURL[0].value.toString());
            let descriptionParams = layer.layerSource.layerSourceOptions.filter(l => l.name == "cswparams");
            if (descriptionParams.length == 1) {
                let cswParams = JSON.parse(descriptionParams[0].value);
                if (cswParams) {
                    let combinedParams = new URLSearchParams(cswParams);
                    if (CSWMetadataGetURL.searchParams) {
                        combinedParams = new URLSearchParams({
                            ...Object.fromEntries(combinedParams),
                            ...Object.fromEntries(CSWMetadataGetURL.searchParams)
                        })
                    }
                    CSWMetadataGetURL.search = combinedParams.toString();
                }
            }

            let fetchUrl = CSWMetadataGetURL.toString();
            if (proxyEndpoint !== "") {
                fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
            }

            let CSWMetadataPromise = new Promise<CSWMetadata>((resolve, reject) => {
                fetch(fetchUrl)
                    .then(response => response.text())
                    .then(data => {
                        let parser = new DOMParser();
                        let doc = parser.parseFromString(data, "application/xml");
                        let keywordTags = doc.getElementsByTagName("dc:subject");
                        let refTags = doc.getElementsByTagName("dct:references");
                        let keywords = [];
                        let refs: CSWMetadataLinks[] = [];
                        for (let keyword of keywordTags) {
                            keywords.push(keyword.innerHTML)
                        };
                        for (let ref of refTags) {
                            if (ref.innerHTML !== "" && ref.getAttribute("scheme") !== null) {
                                let metaLink: CSWMetadataLinks = {
                                    url: ref.innerHTML,
                                    type: ref.getAttribute("scheme")
                                }

                                refs.push(metaLink);
                            }
                        };
                        let CSWMetadata: CSWMetadata = {
                            title: doc.getElementsByTagName("dc:title")[0]?.innerHTML,
                            abstract: doc.getElementsByTagName("dct:abstract")[0]?.innerHTML,
                            accessRights: doc.getElementsByTagName("dct:accessRights")[0]?.innerHTML,
                            keywords: keywords,
                            dataLinks: refs,
                            documentURL: CSWMetadataGetURL.toString()
                        }
                        resolve(CSWMetadata);
                    })
                    .catch(e => {
                        console.error(e);
                        reject("Couldn't retrieve Metadata document");
                    })
            })
            return CSWMetadataPromise;
        } else if (layer.layerSource.description !== '') {
            let CSWMetadata: CSWMetadata = {
                title: layer.name,
                abstract: layer.layerSource.description,
                accessRights: '',
                keywords: null,
                dataLinks: null,
                documentURL: null
            }
            let CSWMetadataPromise = new Promise<CSWMetadata>((resolve, reject) => {
                resolve(CSWMetadata);
            })
            return CSWMetadataPromise;
        } else {
            return null;
        }
        
    }

    /**
     * Returns the HTML for the CSWMetadata modal
     *
     * @param {CSWMetadata} CSWMetadata - CSWMetadata object
     * @returns HTML for the CSWMetadata
     *
    */

    static createCSWMetadataHTML(CSWMetadata: CSWMetadata, isFiltered:boolean = false): string {
        if (CSWMetadata.abstract !== undefined) {
            return `
                <h5>${CSWMetadata.title}</h5>
                ${isFiltered ? this.renderLayerFilteredWarning(): ""}
                <p class="text-pre-line">${CSWMetadata.abstract}</p>
                ${this.renderMetadataKeywords(CSWMetadata.keywords)}
                ${this.renderMetadataDataLinks(CSWMetadata.dataLinks, CSWMetadata.documentURL)}
                ${this.renderAccessRights(CSWMetadata.accessRights)}
                `
        } else {
        return `
                <h5>${CSWMetadata.title}</h5>
                ${isFiltered ? this.renderLayerFilteredWarning() : ""}
                <p class="text-pre-line">No description</p>
                ${this.renderMetadataKeywords(CSWMetadata.keywords)}
                ${this.renderMetadataDataLinks(CSWMetadata.dataLinks, CSWMetadata.documentURL)}
                ${this.renderAccessRights(CSWMetadata.accessRights)}
                `
        }
    }

    private static renderMetadataKeywords(keywords: string[]): string {
        if (keywords && keywords.length !== 0) {
            let keywordContainer = document.createElement('div');
            keywords.forEach(k => {
                let badge = Badge.create(k, ["rounded-pill", "border", "bg-primary", "me-2"]);
                keywordContainer.appendChild(badge);
            });

            return `<h6>Keywords</h6>${keywordContainer.innerHTML}`;
        }
        return '';
    }

    private static renderMetadataDataLinks(dataLinks: CSWMetadataLinks[], documentURL: string): string {
        
        if (!(dataLinks === null && documentURL === null)) {
            let dataLinksHTML = 
                `<table class="table table-striped table-sm">
                    <tbody>`;
            dataLinks?.forEach(dl => {
                dataLinksHTML += `<tr><td><a href="${dl.url}" target="_blank" rel="noopener">${dl.type}</a></td></tr>`;

            });
            if (documentURL !== null) {
                dataLinksHTML += `<tr><td><a href="${documentURL}" target="_blank" rel="noopener">Full metadata document</a></td></tr>`;
            }

            dataLinksHTML +=
                `   </tbody>
                </table>`;

            return `<h6>Data Links</h6>${dataLinksHTML}`;
        }
        return '';
    }

    private static renderAccessRights(accessRights: string): string {

        if (accessRights) {
            let accessRightsHTML = `<p>`;
            if (accessRights.startsWith('http')) {
                accessRightsHTML += `<a href="${accessRights}" target="_blank" rel="noopener">Further information on access rights</a>`
            } else {
                accessRightsHTML += accessRights;
            }
            accessRightsHTML += `</p>`;

            return `<h6>Access rights</h6>${accessRightsHTML}`;
        }
        return '';
    }

    private static renderLayerFilteredWarning(): string {

        return `<div class="alert alert-info small p-2">
                    This layer has a filter applied, so the metadata below may not exactly reflect what you see on the map
                </div>`
    }

    static showMetadataModal(layerConfig: Layer, isFiltered: boolean = false, proxyEndpoint:string = "") {
        let metaModal = new Modal(document.getElementById('meta-modal'), {});
        let metaModalContent = document.querySelector('#meta-modal .modal-body');
        if (layerConfig) {
            let descriptionHTML: string = `<h5 class="card-title placeholder-glow">
                                                <span class="placeholder col-6"></span>
                                            </h5>
                                            <p class="card-text placeholder-glow">
                                                <span class="placeholder col-7"></span>
                                                <span class="placeholder col-4"></span>
                                                <span class="placeholder col-4"></span>
                                                <span class="placeholder col-6"></span>
                                                <span class="placeholder col-8"></span>
                                            </p>`;

            metaModalContent.innerHTML = descriptionHTML;
            metaModal.show();


            
            let metadataPromise = CSWMetadataViewer.getCSWMetadataForLayer(layerConfig, proxyEndpoint);
            if (metadataPromise) {
                metadataPromise.then(metadata => {
                    metaModalContent.innerHTML = CSWMetadataViewer.createCSWMetadataHTML(metadata,isFiltered);

                }).catch(e => {
                    metaModalContent.innerHTML = `<p>There was a problem getting the metadata.</p><code>${e}</code>`

                });
            } else {
                metaModalContent.innerHTML = `<p>There is no additional metadata available for this layer</p>`;
            }
        } else {
            metaModalContent.innerHTML = `<p>There is no additional metadata available for this layer</p>`;
        }
    }
}