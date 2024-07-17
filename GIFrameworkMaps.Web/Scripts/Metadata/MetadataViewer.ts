import { Modal } from "bootstrap";
import { VectorImage, Layer as olLayer } from "ol/layer";
import { ImageWMS, TileWMS, Vector } from "ol/source";
import Badge from "../Badge";
import { Layer } from "../Interfaces/Layer";
import {
    SimpleMetadata,
    MetadataLinks,
} from "../Interfaces/OGCMetadata/SimpleMetadata";
import { GIFWMap } from "../Map";
import { Helper, Mapping as MappingUtil } from "../Util";
import { Metadata } from "./Metadata";
import { ServiceType } from "../Interfaces/WebLayerServiceDefinition";

export class MetadataViewer {
  static async getMetadataForLayer(
    layer: Layer,
    olLayer: olLayer,
    proxyEndpoint: string = "",
  ) {
    /*get metadata from sources in priority order*/
    /*     1: Metadata from GetCapabilities document
           2: Metadata from database description
        */

    let metadata = await this.getMetadataFromGetCapabilities(
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
    
  static async getMetadataFromGetCapabilities(
    layer: Layer,
    olLayer: olLayer,
    proxyEndpoint?: string,
  ) {
    try {
      const source = olLayer.getSource();
      if (
        source instanceof TileWMS ||
        source instanceof ImageWMS ||
        source instanceof Vector ||
        source instanceof VectorImage
      ) {
        let baseUrl: string;
        let params;
        let serviceType: ServiceType = ServiceType.WMS;
        let layerName = "";
        if (source instanceof TileWMS) {
          baseUrl = source.getUrls()[0];
          params = source.getParams();
          layerName = params.LAYERS;

        } else if (source instanceof ImageWMS) {
          baseUrl = (source as ImageWMS).getUrl();
          params = (source as ImageWMS).getParams();
          layerName = params.LAYERS;
        } else {
          baseUrl = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "url");
          layerName = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "typename");
          const paramsOpt = MappingUtil.getLayerSourceOptionValueByName(layer.layerSource.layerSourceOptions, "params");
          if (paramsOpt !== null) {
            params = JSON.parse(paramsOpt);
          }
          serviceType = ServiceType.WFS;
          
        }
        const version =
          (Helper.getValueFromObjectByKey(params, "version") as string) ||
          "1.1.0";
        const httpHeaders = MappingUtil.extractCustomHeadersFromLayerSource(
          layer.layerSource,
        );

        const layerMetadata = await Metadata.getLayerMetadataFromCapabilities(baseUrl, layerName, serviceType, version, proxyEndpoint, httpHeaders);
        
        if (layerMetadata) {
          const simpleMetadata: SimpleMetadata = {
            title: layerMetadata.title || layer.name,
            abstract: layerMetadata.abstract || "No description provided",
            attribution: layerMetadata.attribution || layer.layerSource.attribution.renderedAttributionHTML,
            accessRights: "",
            keywords: layerMetadata.keywords,
            dataLinks: [
              {
                url: Metadata.constructGetCapabilitiesURL(
                  baseUrl,
                  serviceType,
                  version,
                ),
                type: `${ServiceType[serviceType].toUpperCase()} GetCapabilities`,
              },
            ],
            documentURL: Metadata.constructGetCapabilitiesURL(
              baseUrl,
              serviceType,
              version,
            ),
          };
          return simpleMetadata;
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
      const SimpleMetadata: SimpleMetadata = {
        title: layer.name,
        abstract: layer.layerSource.description || "No description provided",
        attribution: layer.layerSource.attribution.renderedAttributionHTML,
        accessRights: "",
        keywords: null,
        dataLinks: null,
        documentURL: null,
      };
      return SimpleMetadata;
    }
    return null;
  }

  /**
   * Returns the HTML for the CSWMetadata modal
   *
   * @param {SimpleMetadata} simpleMetadata - CSWMetadata object
   * @returns HTML for the CSWMetadata
   *
   */

  static createMetadataHTML(
    simpleMetadata: SimpleMetadata,
    isFiltered: boolean = false,
  ): string {
    if (simpleMetadata.abstract !== undefined) {
      return `
                <h5>${simpleMetadata.title}</h5>
                ${isFiltered ? this.renderLayerFilteredWarning() : ""}
                <p class="text-pre-line">${simpleMetadata.abstract}</p>
                ${this.renderMetadataKeywords(simpleMetadata.keywords)}
                ${this.renderAttribution(simpleMetadata.attribution)}
                ${this.renderMetadataDataLinks(
                  simpleMetadata.dataLinks,
                  simpleMetadata.documentURL,
                )}
                ${this.renderAccessRights(simpleMetadata.accessRights)}
                `;
    } else {
      return `
                <h5>${simpleMetadata.title}</h5>
                ${isFiltered ? this.renderLayerFilteredWarning() : ""}
                <p class="text-pre-line">No description</p>
                ${this.renderMetadataKeywords(simpleMetadata.keywords)}
                ${this.renderAttribution(simpleMetadata.attribution)}
                ${this.renderMetadataDataLinks(
                  simpleMetadata.dataLinks,
                  simpleMetadata.documentURL,
                )}
                ${this.renderAccessRights(simpleMetadata.accessRights)}
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
    dataLinks: MetadataLinks[],
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
    gifwMapInstance: GIFWMap
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
      let proxyEndpoint = ""
      if (layerConfig.proxyMetaRequests) {
        proxyEndpoint = `${document.location.protocol}//${gifwMapInstance.config.appRoot}proxy`;
      }
      const isFiltered = gifwMapInstance.getLayerFilteredStatus(layerConfig, olLayer, false);
      const metadata = await MetadataViewer.getMetadataForLayer(
        layerConfig,
        olLayer,
        proxyEndpoint,
      );
      if (metadata) {
        metaModalContent.innerHTML = MetadataViewer.createMetadataHTML(
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
