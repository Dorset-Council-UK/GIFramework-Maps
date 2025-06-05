import Fuse from "fuse.js";
import { LayerResource } from "../Interfaces/OGCMetadata/LayerResource";
import { getLayersFromCapabilities } from "../Metadata/Metadata";
import { ServiceType } from "../Interfaces/WebLayerServiceDefinition";
import { AuthManager } from "../AuthManager";
import { UrlAuthorizationRules } from "../Interfaces/Authorization/UrlAuthorizationRules";

export class SelectWebService {
  preferredProjections: string[] = [];
  _fuseInstance: Fuse<LayerResource>;
  _authManager: AuthManager | null = null;

  public async init(urlAuthorizationRules: UrlAuthorizationRules[], appRoot:string) {
    //set preferred projections
    const preferredProjectionsInput = (document.getElementById('preferred-projections-list') as HTMLInputElement);
    this.preferredProjections = preferredProjectionsInput.value.split(",");
    this._authManager = new AuthManager(null, urlAuthorizationRules, `${document.location.protocol}//${appRoot}account/token`);
    await this._authManager.refreshAccessToken();
    //hook up connect buttons
    const listConnectBtn = document.getElementById("web-service-list-connect");
    const urlConnectBtn = document.getElementById("web-service-text-connect");

    listConnectBtn.addEventListener("click", () => {
      //get selected value
      const webServiceList = document.getElementById("service-select") as HTMLSelectElement;
      const url = webServiceList.selectedOptions[0].value;
      const version = webServiceList.selectedOptions[0].dataset.ogcVersion || "1.1.0";
      const type = webServiceList.selectedOptions[0].dataset.type;
      const proxyEndpoint = webServiceList.selectedOptions[0].dataset.proxyVia;
      this.renderLayersListFromService(url, type as ServiceType, version, proxyEndpoint);
    });

    urlConnectBtn.addEventListener("click", () => {
      //parse URL and fetch
      const webServiceInput = document.getElementById(
        "service-url",
      ) as HTMLInputElement;
      const webServiceUseProxy = document.getElementById(
        "use-proxy",
      ) as HTMLInputElement;
      const url = webServiceInput.value;
      const type = (document.getElementById('service-type') as HTMLSelectElement).selectedOptions[0].value;
      this.renderLayersListFromService(
        url,
        type as ServiceType,
        webServiceUseProxy.checked ? webServiceUseProxy.value : ""
      );
    });

    const searchInput: HTMLInputElement = document.getElementById(
      "layer-list-search",
    ) as HTMLInputElement;

    searchInput.addEventListener("input", () => {
      this.filterLayersListByText(searchInput.value.trim());
    });
  }

  private async renderLayersListFromService(
    url: string,
    type: ServiceType,
    version?: string,
    proxyEndpoint?: string,
  ) {
    const loadingSpinner = document.getElementById("layers-loading-spinner");
    loadingSpinner.style.display = "block";

    const headers: Headers = new Headers;
    this._authManager.applyAuthenticationToRequestHeaders(url,headers)
    const availableLayers = await getLayersFromCapabilities(
      url,
      type,
      version,
      proxyEndpoint,
      headers
    );

    const layersListContainer = document.getElementById("layer-list-container");
    const errMsg = document.getElementById("web-layer-search-error");

    const searchInput: HTMLInputElement = document.getElementById(
      "layer-list-search",
    ) as HTMLInputElement;
    layersListContainer.innerHTML = "";
    if (availableLayers && availableLayers.length !== 0) {
      availableLayers
        .sort((a, b) => {
          return a.title.localeCompare(b.title);
        })
        .forEach((layer) => {
          layersListContainer.appendChild(this.renderLayerItem(layer, type));
        });

      searchInput.style.display = "";
      searchInput.value = "";
      this.createOrUpdateFuseInstance(availableLayers);
      const form = document.getElementById("create-source-form") as HTMLFormElement;
      (form.querySelector('input[name="type"]') as HTMLInputElement).value = type;
    } else {
      layersListContainer.innerHTML =
        '<div class="alert alert-warning">No layers could be retrieved from the service. You may need to be logged in to the service to see layers, or the service is not advertising any layers at the moment.</div>';
      searchInput.style.display = "none";
    }
    loadingSpinner.style.display = "none";
    errMsg.style.display = "none";
  }

  private renderLayerItem(layer: LayerResource, type: ServiceType) {
    const layerItemFragment = document.getElementById(
      "web-service-layer-item-template",
    ) as HTMLTemplateElement;
    const layerItemInstance = document.importNode(
      layerItemFragment.content,
      true,
    );

    const container = layerItemInstance.querySelector(".list-group-item");
    const header = layerItemInstance.querySelector("h5");
    const epsgSelectInput = layerItemInstance.querySelector(
      "select[data-epsg-selector]",
    ) as HTMLSelectElement;
    const formatSelectInput = layerItemInstance.querySelector(
      "select[data-format-selector]",
    ) as HTMLSelectElement;
    const desc = layerItemInstance.querySelector("p");
    const btn = layerItemInstance.querySelector("button");

    container.id = layer.name;
    header.textContent = layer.title;
    desc.textContent = layer.abstract;
    const preferredProjection = this.preferredProjections.find((p) =>
      layer.projections.includes(p),
    );
    if (preferredProjection) {
      //move the preferred projection to the top
      layer.projections.sort((x, y) => {
        return x == preferredProjection ? -1 : y == preferredProjection ? 1 : 0;
      });
    }
    layer.projections.forEach((projection) => {
      const opt = document.createElement("option");
      opt.value = projection;
      opt.text = projection;
      epsgSelectInput.options.add(opt);
    });
    //move preferred formats to top
    const preferredFormats = type === ServiceType.WMS ? (layer.opaque ? this.preferredWMSOpaqueFormats : this.preferredWMSTransparentFormats) : this.preferredWFSFormats;
    const allFormats = layer.formats;
    layer.formats = preferredFormats.filter(f => {
      return layer.formats.some(l => {
        return f === l;
      })
    })
    const recommendedOptGroup = document.createElement('optgroup');
    recommendedOptGroup.label = 'Recommended';
    layer.formats.forEach((format) => {
      const opt = document.createElement("option");
      opt.value = format;
      opt.text = format;
      recommendedOptGroup.appendChild(opt);
    });
    formatSelectInput.options.add(recommendedOptGroup);
    const allOptGroup = document.createElement('optgroup');
    allOptGroup.label = 'All';
    formatSelectInput.options.add(allOptGroup);
    allFormats.forEach((format) => {
      const opt = document.createElement("option");
      opt.value = format;
      opt.text = format;
      allOptGroup.appendChild(opt);
    });
    formatSelectInput.options.add(allOptGroup);
    btn.addEventListener("click", () => {
      const form = document.getElementById(
        "create-source-form",
      ) as HTMLFormElement;
      (
        form.querySelector('input[name="layerDetails"]') as HTMLInputElement
      ).value = JSON.stringify(layer);
      (
        form.querySelector('input[name="projection"]') as HTMLInputElement
      ).value = epsgSelectInput.selectedOptions[0].value;
      (form.querySelector('input[name="format"]') as HTMLInputElement).value =
        formatSelectInput.selectedOptions[0].value;

      form.submit();
    });

    return layerItemInstance;
  }

  private filterLayersListByText(text: string) {
    const allItems = document.querySelectorAll(
      "#layer-list-container .list-group-item",
    );
    const errMsg = document.getElementById("web-layer-search-error");
    if (text.trim().length === 0) {
      //show all layers and clear error
      errMsg.style.display = "none";
      allItems.forEach((layer) => {
        (layer as HTMLDivElement).style.display = "";
      });
    } else {
      const results = this._fuseInstance.search(text);
      if (results.length === 0) {
        //no results. show all with error
        allItems.forEach((layer) => {
          (layer as HTMLDivElement).style.display = "";
        });
        errMsg.innerText = `No results found for '${text}'`;
        errMsg.style.display = "";
      } else {
        errMsg.style.display = "none";
        const matchingLayers = results.map(
          (r) => (r.item as LayerResource).name,
        );
        allItems.forEach((layer) => {
          if (matchingLayers.includes(layer.id)) {
            (layer as HTMLDivElement).style.display = "";
          } else {
            (layer as HTMLDivElement).style.display = "none";
          }
        });
      }
    }
  }

  private createOrUpdateFuseInstance(layers: LayerResource[]): void {
    const options = {
      includeScore: true,
      includeMatches: true,
      threshold: 0.2,
      keys: ["title", "abstract"],
    };

    this._fuseInstance = new Fuse(layers, options);
  }

  private preferredWMSTransparentFormats = ["image/png", "image/png; mode=8bit", "image/png8", "image/gif"];
  private preferredWMSOpaqueFormats = ["image/jpeg", ...this.preferredWMSTransparentFormats];
  private preferredWFSFormats = [
    "application/json", "text/json", "geojson", "json",
    /*"application/gml+xml; version=3.2", "gml32", "text/xml; subtype=gml/3.2",*/ /*GML3.2 support is flaky in OpenLayers*/
    "text/xml; subtype=gml/3.1.1", "gml3",
    "kml", "application/vnd.google-earth.kml xml", "application/vnd.google-earth.kml+xml"
  ];
}
