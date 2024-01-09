﻿import { Modal } from "bootstrap";
import Badge from "../Badge";
import { Layer } from "../Interfaces/Layer";
import {
  CSWMetadata,
  CSWMetadataLinks,
} from "../Interfaces/OGCMetadata/CSWMetadata";
import { Layer as olLayer } from "ol/layer";
import { ImageWMS, TileWMS } from "ol/source";
import { Metadata } from "./Metadata";
import { Helper, Mapping as MappingUtil } from "../Util";

export class MetadataViewer {
  static async getCSWMetadataForLayer(
    layer: Layer,
    olLayer: olLayer,
    proxyEndpoint: string = "",
  ) {
    /*get metadata from sources in priority order*/
    /* 1: CSW Metadata document included in params
           2: Metadata from GetCapabilities document
           3: Metadata from database description
        */

    let metadata = await this.getMetadataFromCSWDocument(
      layer,
      olLayer,
      proxyEndpoint,
    );
    if (metadata) {
      return metadata;
    }
    metadata = await this.getMetadataFromGetCapabilities(
      layer,
      olLayer,
      proxyEndpoint,
    );
    if (metadata) {
      return metadata;
    }
    metadata = this.getMetadataFromLayerSource(layer);
    if (metadata) {
      return metadata;
    }

    return null;
  }

  static async getMetadataFromCSWDocument(
    layer: Layer,
    olLayer: olLayer,
    proxyEndpoint?: string,
  ) {
    try {
      const cswMetadataEndpoint = layer.layerSource.layerSourceOptions.filter(
        (l) => l.name == "cswendpoint",
      );
      if (cswMetadataEndpoint && cswMetadataEndpoint.length !== 0) {
        const cswMetadataURL = new URL(cswMetadataEndpoint[0].value);
        const descriptionParams = layer.layerSource.layerSourceOptions.filter(
          (l) => l.name == "cswparams",
        );
        if (descriptionParams.length == 1) {
          const cswParams = JSON.parse(descriptionParams[0].value);
          if (cswParams) {
            let combinedParams = new URLSearchParams(cswParams);
            if (cswMetadataURL.searchParams) {
              combinedParams = new URLSearchParams({
                ...Object.fromEntries(combinedParams),
                ...Object.fromEntries(cswMetadataURL.searchParams),
              });
            }
            cswMetadataURL.search = combinedParams.toString();
          }
        }

        let fetchUrl = cswMetadataURL.toString();
        if (proxyEndpoint !== "") {
          fetchUrl = `${proxyEndpoint}?url=${encodeURIComponent(fetchUrl)}`;
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(
            `Couldn't retrieve metadata document from CSW endpoint. Status: ${response.status}`,
          );
        }
        const data = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "application/xml");
        if (!doc.childNodes[0].hasChildNodes()) {
          throw new Error(`Metadata document returned no information`);
        }
        const keywordTags = doc.getElementsByTagName("dc:subject");
        const refTags = doc.getElementsByTagName("dct:references");
        const keywords = [];
        const refs: CSWMetadataLinks[] = [];
        for (const keyword of keywordTags) {
          keywords.push(keyword.innerHTML);
        }
        for (const ref of refTags) {
          if (ref.innerHTML !== "" && ref.getAttribute("scheme") !== null) {
            if (
              olLayer.getSource() instanceof TileWMS ||
              olLayer.getSource() instanceof ImageWMS
            ) {
              const source = olLayer.getSource();
              let baseUrl: string;
              let params;
              if (source instanceof TileWMS) {
                baseUrl = source.getUrls()[0];
                params = source.getParams();
              } else {
                baseUrl = (source as ImageWMS).getUrl();
                params = (source as ImageWMS).getParams();
              }
              const version =
                (Helper.getValueFromObjectByKey(params, "version") as string) ||
                "1.1.0";

              const type = ref.getAttribute("scheme");
              if (type.toUpperCase() == "OGC:WMS") {
                const metaLink: CSWMetadataLinks = {
                  url: Metadata.constructGetCapabilitiesURL(
                    baseUrl,
                    "WMS",
                    version,
                  ),
                  type: "WMS GetCapabilities",
                };

                refs.push(metaLink);
              }
              if (type.toUpperCase() == "OGC:WFS") {
                const metaLink: CSWMetadataLinks = {
                  url: Metadata.constructGetCapabilitiesURL(
                    baseUrl,
                    "WFS",
                    version,
                  ),
                  type: "WFS GetCapabilities",
                };

                refs.push(metaLink);
              }
            }
          }
        }
        const CSWMetadata: CSWMetadata = {
          title:
            doc.getElementsByTagName("dc:title")[0]?.innerHTML || layer.name,
          abstract:
            doc.getElementsByTagName("dct:abstract")[0]?.innerHTML ||
            "No description provided",
          accessRights:
            doc.getElementsByTagName("dct:accessRights")[0]?.innerHTML,
          keywords: keywords,
          attribution: "",
          dataLinks: refs,
          documentURL: cswMetadataURL.toString(),
        };
        return CSWMetadata;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  static async getMetadataFromGetCapabilities(
    layer: Layer,
    olLayer: olLayer,
    proxyEndpoint?: string,
  ) {
    try {
      if (
        olLayer.getSource() instanceof TileWMS ||
        olLayer.getSource() instanceof ImageWMS
      ) {
        const source = olLayer.getSource();
        let baseUrl: string;
        let params;
        if (source instanceof TileWMS) {
          baseUrl = source.getUrls()[0];
          params = source.getParams();
        } else {
          baseUrl = (source as ImageWMS).getUrl();
          params = (source as ImageWMS).getParams();
        }
        const version =
          (Helper.getValueFromObjectByKey(params, "version") as string) ||
          "1.1.0";
        const httpHeaders = MappingUtil.extractCustomHeadersFromLayerSource(
          layer.layerSource,
        );
        const layers = await Metadata.getLayersFromCapabilities(
          baseUrl,
          version,
          proxyEndpoint,
          httpHeaders,
        );
        const featureTypeName = params.LAYERS;
        if (layers) {
          const matchedLayer = layers.filter((l) => l.name === featureTypeName);
          if (matchedLayer.length !== 0) {
            const CSWMetadata: CSWMetadata = {
              title: matchedLayer[0].title || layer.name,
              abstract: matchedLayer[0].abstract || "No description provided",
              attribution: matchedLayer[0].attribution,
              accessRights: "",
              keywords: matchedLayer[0].keywords,
              dataLinks: [
                {
                  url: Metadata.constructGetCapabilitiesURL(
                    baseUrl,
                    "WMS",
                    version,
                  ),
                  type: "WMS GetCapabilities",
                },
              ],
              documentURL: Metadata.constructGetCapabilitiesURL(
                baseUrl,
                "WMS",
                version,
              ),
            };
            return CSWMetadata;
          }
        }
      }
    } catch (e) {
      console.error(
        "Couldn't retrieve metadata document from GetCapabilities endpoint.",
        e,
      );
    }
    return null;
  }

  static getMetadataFromLayerSource(layer: Layer) {
    if (layer.layerSource.description !== "") {
      const CSWMetadata: CSWMetadata = {
        title: layer.name,
        abstract: layer.layerSource.description || "No description provided",
        attribution: layer.layerSource.attribution.renderedAttributionHTML,
        accessRights: "",
        keywords: null,
        dataLinks: null,
        documentURL: null,
      };
      return CSWMetadata;
    }
    return null;
  }

  /**
   * Returns the HTML for the CSWMetadata modal
   *
   * @param {CSWMetadata} CSWMetadata - CSWMetadata object
   * @returns HTML for the CSWMetadata
   *
   */

  static createCSWMetadataHTML(
    CSWMetadata: CSWMetadata,
    isFiltered: boolean = false,
  ): string {
    if (CSWMetadata.abstract !== undefined) {
      return `
                <h5>${CSWMetadata.title}</h5>
                ${isFiltered ? this.renderLayerFilteredWarning() : ""}
                <p class="text-pre-line">${CSWMetadata.abstract}</p>
                ${this.renderMetadataKeywords(CSWMetadata.keywords)}
                ${this.renderAttribution(CSWMetadata.attribution)}
                ${this.renderMetadataDataLinks(
                  CSWMetadata.dataLinks,
                  CSWMetadata.documentURL,
                )}
                ${this.renderAccessRights(CSWMetadata.accessRights)}
                `;
    } else {
      return `
                <h5>${CSWMetadata.title}</h5>
                ${isFiltered ? this.renderLayerFilteredWarning() : ""}
                <p class="text-pre-line">No description</p>
                ${this.renderMetadataKeywords(CSWMetadata.keywords)}
                ${this.renderAttribution(CSWMetadata.attribution)}
                ${this.renderMetadataDataLinks(
                  CSWMetadata.dataLinks,
                  CSWMetadata.documentURL,
                )}
                ${this.renderAccessRights(CSWMetadata.accessRights)}
                `;
    }
  }

  private static renderMetadataKeywords(keywords: string[]): string {
    if (keywords && keywords.length !== 0) {
      const keywordContainer = document.createElement("div");
      keywordContainer.className = "pb-2"
      keywords.forEach((k) => {
        const badge = Badge.create(k, [
          "rounded-pill",
          "border",
          "bg-primary",
          "me-2",
        ]);
        keywordContainer.appendChild(badge);
      });

      return `<h6>Keywords</h6>${keywordContainer.outerHTML}`;
    }
    return "";
  }

  private static renderMetadataDataLinks(
    dataLinks: CSWMetadataLinks[],
    documentURL: string,
  ): string {
    if (!(dataLinks === null && documentURL === null)) {
      let dataLinksHTML = `<table class="table table-striped table-sm">
                    <tbody>`;
      dataLinks?.forEach((dl) => {
        dataLinksHTML += `<tr><td><a href="${dl.url}" target="_blank" rel="noopener">${dl.type}</a></td></tr>`;
      });
      if (documentURL !== null) {
        dataLinksHTML += `<tr><td><a href="${documentURL}" target="_blank" rel="noopener">Full metadata document</a></td></tr>`;
      }

      dataLinksHTML += `   </tbody>
                </table>`;

      return `<h6>Data Links</h6>${dataLinksHTML}`;
    }
    return "";
  }

  private static renderAccessRights(accessRights: string): string {
    if (accessRights) {
      let accessRightsHTML = `<p>`;
      if (accessRights.startsWith("http")) {
        accessRightsHTML += `<a href="${accessRights}" target="_blank" rel="noopener">Further information on access rights</a>`;
      } else {
        accessRightsHTML += accessRights;
      }
      accessRightsHTML += `</p>`;

      return `<h6>Access rights</h6>${accessRightsHTML}`;
    }
    return "";
    }

    private static renderAttribution(attribution: string): string {
        if (attribution) {
            let attributionHTML = `<p>`;
            attributionHTML += attribution;
            attributionHTML += `</p>`;

            return `<h6>Attribution</h6>${attributionHTML}`;
        }
        return "";
    }

  private static renderLayerFilteredWarning(): string {
    return `<div class="alert alert-info small p-2">
                    This layer has a filter applied, so the metadata below may not exactly reflect what you see on the map
                </div>`;
  }

  static async showMetadataModal(
    layerConfig: Layer,
    olLayer: olLayer,
    isFiltered: boolean = false,
    proxyEndpoint: string = "",
  ) {
    const metaModal = new Modal(document.getElementById("meta-modal"), {});
    const metaModalContent = document.querySelector("#meta-modal .modal-body");
    if (layerConfig) {
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

      metaModalContent.innerHTML = descriptionHTML;
      metaModal.show();

      const metadata = await MetadataViewer.getCSWMetadataForLayer(
        layerConfig,
        olLayer,
        proxyEndpoint,
      );
      if (metadata) {
        metaModalContent.innerHTML = MetadataViewer.createCSWMetadataHTML(
          metadata,
          isFiltered,
        );
        return;
      }
    }
    metaModalContent.innerHTML = `<p>There is no additional metadata available for this layer</p>`;
    return;
  }
}
