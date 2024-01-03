import GML3 from "ol/format/GML3";
import WFS from "ol/format/WFS";
import { FeaturePropertiesHelper } from "../FeatureQuery/FeaturePropertiesHelper";
import { FeatureQueryRequest } from "../Interfaces/FeatureQuery/FeatureQueryRequest";
import { FeatureQueryResponse } from "../Interfaces/FeatureQuery/FeatureQueryResponse";
import { CapabilityType } from "../Interfaces/OGCMetadata/BasicServerCapabilities";
import { Metadata } from "../Metadata/Metadata";
import { FeatureQueryTemplateHelper } from "../FeatureQuery/FeatureQueryTemplateHelper";
//global var defined in view. Replace me with another method :)
declare let proxyEndpoint: string;
export class CreateLayerFromSource {
  htmlTags = [
    { tagId: "h1", openTag: "<h1>", closeTag: "</h1>" },
    { tagId: "h2", openTag: "<h2>", closeTag: "</h2>" },
    { tagId: "h3", openTag: "<h3>", closeTag: "</h3>" },
    { tagId: "h4", openTag: "<h4>", closeTag: "</h4>" },
    { tagId: "p", openTag: "<p>", closeTag: "</p>" },
    { tagId: "br", openTag: "<br/>", closeTag: "" },
    { tagId: "strong", openTag: "<strong>", closeTag: "</strong>" },
    { tagId: "i", openTag: "<i>", closeTag: "</i>" },
    {
      tagId: "a",
      openTag: '<a href="" target="_blank" title="">',
      openTagText: "<a>",
      closeTag: "</a>",
    },
    {
      tagId: "img",
      openTag: '<img src="" class="img-fluid" />',
      openTagText: "<img>",
      closeTag: "",
    },
  ];
  templateInput: HTMLTextAreaElement;
  listTemplateInput: HTMLInputElement;
  layerSourceURL: string;
  layerSourceName: string;
  proxyEndpoint: string;
  _cachedExampleFeature: unknown;
  constructor() {
    this.templateInput = document.querySelector(
      "textarea[data-template-target]",
    ) as HTMLTextAreaElement;
    this.listTemplateInput = document.querySelector(
      "input[data-list-template-target]",
    ) as HTMLInputElement;
    this.layerSourceURL = (
      document.getElementById("layer-source-url") as HTMLInputElement
    ).value;
    this.layerSourceName = (
      document.getElementById("layer-source-name") as HTMLInputElement
    ).value;
    this.proxyEndpoint = proxyEndpoint;
    FeatureQueryTemplateHelper.configureNunjucks();
  }

  public async init() {
    await this.renderAttributeLists();
    await this.getPropertySuggestions();
    //attach HTML tag buttons
    this.renderHTMLTagsList();

    //attach date formatting helper buttons
    document
      .querySelectorAll(
        "#list-template-date-formatting-pane a[data-date-format]",
      )
      .forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const formatString = (link as HTMLAnchorElement).dataset.dateFormat;
          let formatTemplate = " | date";
          if (formatString) {
            formatTemplate += `('${formatString}')`;
          }
          this.insertAtCaret(formatTemplate, this.listTemplateInput);
        });
      });
    document
      .querySelectorAll("#template-date-formatting-pane a[data-date-format]")
      .forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const formatString = (link as HTMLAnchorElement).dataset.dateFormat;
          let formatTemplate = " | date";
          if (formatString) {
            formatTemplate += `('${formatString}')`;
          }
          this.insertAtCaret(formatTemplate, this.templateInput);
        });
      });
    //attach preview generators
    const templatePreviewGeneratorButton = document.getElementById(
      "template-preview-generate",
    );
    const listTemplatePreviewGeneratorButton = document.getElementById(
      "list-template-preview-generate",
    );
    if (templatePreviewGeneratorButton) {
      templatePreviewGeneratorButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.generateTemplatePreview(
          this.templateInput.value,
          document.getElementById("template-preview-container"),
        );
      });
    }
    if (listTemplatePreviewGeneratorButton) {
      listTemplatePreviewGeneratorButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.generateTemplatePreview(
          this.listTemplateInput.value,
          document.getElementById("list-template-preview-container"),
        );
      });
    }

    //attach auto generate template button
    const autoGenerateTemplateButton = document.querySelector(
      "#template-auto-generate a",
    );
    if (autoGenerateTemplateButton) {
      document
        .querySelector("#template-auto-generate a")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.autoGenerateTemplate();
        });
    }

    //attach template visibility toggler
    const checkbox = document.querySelector(
      "input[data-queryable-check]",
    ) as HTMLInputElement;
    if (checkbox) {
      this.setTemplateVisibility();
      checkbox.addEventListener("change", () => {
        this.setTemplateVisibility();
      });
    }
  }

  private async getPropertySuggestions() {
    if (this.layerSourceURL !== "" && this.layerSourceName !== "") {
      const availableLayers = await Metadata.getLayersFromCapabilities(
        this.layerSourceURL,
        "",
        this.getProxyEndpoint(),
      );
      if (availableLayers && availableLayers.length !== 0) {
        const curLayer = availableLayers.filter(
          (l) => l.name === this.layerSourceName,
        );
        if (curLayer.length === 1) {
          //make suggestions
          if (curLayer[0].queryable === false) {
            document.getElementById(
              "non-queryable-layer-warning",
            ).style.display = "";
          }
          const layerNameInput = document.querySelector(
            "input[data-name-input]",
          ) as HTMLInputElement;
          if (layerNameInput.value === "") {
            layerNameInput.value = curLayer[0].title;
          }
        }
      }
    }
  }

  private async getAttributesForLayer() {
    if (this.layerSourceURL !== "" && this.layerSourceName !== "") {
      const serverCapabilities = await Metadata.getBasicCapabilities(
        this.layerSourceURL,
        {},
        this.getProxyEndpoint(),
      );

      if (
        serverCapabilities &&
        serverCapabilities.capabilities.filter(
          (c) => c.type === CapabilityType.DescribeFeatureType && c.url !== "",
        ).length !== 0
      ) {
        //has all relevant capabilities
        const describeFeatureCapability =
          serverCapabilities.capabilities.filter(
            (c) => c.type === CapabilityType.DescribeFeatureType,
          )[0];
        const featureDescription = await Metadata.getDescribeFeatureType(
          describeFeatureCapability.url,
          this.layerSourceName,
          describeFeatureCapability.method,
          undefined,
          "",
        );
        if (
          featureDescription &&
          featureDescription.featureTypes.length === 1
        ) {
          return featureDescription.featureTypes[0].properties.filter(
            (f) =>
              f.type.indexOf("gml:") === -1 &&
              FeaturePropertiesHelper.isUserDisplayableProperty(f.name),
          );
        }
      }
    }
  }

  private async renderHTMLTagsList() {
    const templateButtonFragment = document.getElementById(
      "template-helper-button-list-item",
    ) as HTMLTemplateElement;
    const htmlTagsContainer = document.querySelector(
      "#template-html-tags-pane ul",
    );
    if (htmlTagsContainer) {
      this.htmlTags.forEach((tag) => {
        //open tag
        const openTagInstance = document.importNode(
          templateButtonFragment.content,
          true,
        );
        const openTagButton = openTagInstance.querySelector(
          "button",
        ) as HTMLButtonElement;
        openTagButton.textContent = tag.openTagText || tag.openTag;
        openTagButton.dataset.tag = tag.openTag;
        openTagButton.addEventListener("click", () => {
          this.insertAtCaret(tag.openTag, this.templateInput);
        });
        htmlTagsContainer.appendChild(openTagInstance);
        //close tag
        if (tag.closeTag !== "") {
          const closeTagInstance = document.importNode(
            templateButtonFragment.content,
            true,
          );
          const closeTagButton = closeTagInstance.querySelector(
            "button",
          ) as HTMLButtonElement;
          closeTagButton.textContent = tag.closeTag;
          closeTagButton.dataset.tag = tag.closeTag;
          closeTagButton.addEventListener("click", () => {
            this.insertAtCaret(tag.closeTag, this.templateInput);
          });
          htmlTagsContainer.appendChild(closeTagInstance);
        }
      });
    }
  }

  private async renderAttributeLists() {
    const featureAttributes = await this.getAttributesForLayer();
    const listTemplateAttributesContainer = document.getElementById(
      "list-template-attributes-pane",
    );
    const templateAttributesContainer = document.getElementById(
      "template-attributes-pane",
    );
    const templateButtonFragment = document.getElementById(
      "template-helper-button-list-item",
    ) as HTMLTemplateElement;
    if (templateAttributesContainer && listTemplateAttributesContainer) {
      if (featureAttributes && featureAttributes.length > 0) {
        featureAttributes.forEach((featureAttribute) => {
          const templateButtonInstance = document.importNode(
            templateButtonFragment.content,
            true,
          );
          const templateAttrBtn = templateButtonInstance.querySelector(
            "button",
          ) as HTMLButtonElement;
          templateAttrBtn.textContent = featureAttribute.name;
          templateAttrBtn.dataset.attributeName = featureAttribute.name;
          templateAttrBtn.addEventListener("click", () => {
            this.insertAtCaret(
              `{{${featureAttribute.name}}}`,
              this.templateInput,
            );
          });
          templateAttributesContainer
            .querySelector("ul")
            .appendChild(templateButtonInstance);

          const listTemplateButtonInstance = document.importNode(
            templateButtonFragment.content,
            true,
          );
          const listTemplateAttrBtn = listTemplateButtonInstance.querySelector(
            "button",
          ) as HTMLButtonElement;
          listTemplateAttrBtn.textContent = featureAttribute.name;
          listTemplateAttrBtn.dataset.attributeName = featureAttribute.name;
          listTemplateAttrBtn.addEventListener("click", () => {
            this.insertAtCaret(
              `{{${featureAttribute.name}}}`,
              this.listTemplateInput,
            );
          });
          listTemplateAttributesContainer
            .querySelector("ul")
            .appendChild(listTemplateButtonInstance);
        });
      } else {
        const errMsg =
          '<div class="alert alert-warning">We couldn\'t automatically determine the attributes available. You can insert attribute references manually using the syntax {{ATTRIBUTE}}</div>';
        templateAttributesContainer.innerHTML = errMsg;
        listTemplateAttributesContainer.innerHTML = errMsg;
        document.getElementById("template-auto-generate").style.display =
          "none";
      }
    }
  }

  private async autoGenerateTemplate() {
    const attributeDetails = await this.getAttributesForLayer();
    let attributes = attributeDetails.flatMap((a) => a.name);
    let template = "";
    //try and find a suitable name column
    const titleProperty =
      FeaturePropertiesHelper.getMostAppropriateTitleFromProperties(attributes);
    if (titleProperty) {
      template = `<h1>{{${titleProperty}}}</h1>\r`;
      //remove attribute from list
      attributes = attributes.filter((a) => a != titleProperty);
    } else {
      //fall back to first property
      const firstProp =
        FeaturePropertiesHelper.getFirstAllowedPropertyFromProperties(
          attributes as unknown as object[],
        );
      template = `<h1>{{${firstProp[1].toString()}}}</h1>\r`;
      attributes = attributes.filter((a) => a != firstProp[1].toString());
    }
    //loop through remaining properties, applying basic template
    attributes.forEach((attr) => {
      let attrFriendlyName = attr.replace("_", " ").toLowerCase();
      attrFriendlyName = `${attrFriendlyName
        .charAt(0)
        .toUpperCase()}${attrFriendlyName.slice(1)}`;
      template += `<p><strong>${attrFriendlyName.replace(
        "_",
        " ",
      )}:</strong> {{${attr}}}</p>\r`;
    });
    this.templateInput.value = template;
  }

  private async generateTemplatePreview(
    template: string,
    previewContainer: HTMLElement,
  ) {
    if (template) {
      //get an example value from the service if possible.

      const props = (await this.getExampleFeature()) as object;
      if (props !== null) {
        const renderedTemplate = FeatureQueryTemplateHelper.renderTemplate(
          template,
          props,
        );
        previewContainer.innerHTML = renderedTemplate;
      } else {
        previewContainer.innerHTML =
          '<div class="alert alert-warning p-2 my-1">We couldn\'t get an example feature from the feature server</div>';
      }
    } else {
      previewContainer.innerHTML =
        '<div class="alert alert-warning p-2 my-1">No template defined!</div>';
    }
  }

  private async getExampleFeature() {
    if (this._cachedExampleFeature) {
      return this._cachedExampleFeature;
    }
    const serverCapabilities = await Metadata.getBasicCapabilities(
      this.layerSourceURL,
      {},
      this.getProxyEndpoint(),
    );

    if (
      serverCapabilities &&
      serverCapabilities.capabilities.filter(
        (c) => c.type === CapabilityType.DescribeFeatureType && c.url !== "",
      ).length !== 0 &&
      serverCapabilities.capabilities.filter(
        (c) => c.type === CapabilityType.WFS_GetFeature && c.url !== "",
      ).length !== 0
    ) {
      //has all relevant capabilities
      const describeFeatureCapability = serverCapabilities.capabilities.filter(
        (c) => c.type === CapabilityType.DescribeFeatureType,
      )[0];
      const featureDescription = await Metadata.getDescribeFeatureType(
        describeFeatureCapability.url,
        this.layerSourceName,
        describeFeatureCapability.method,
        undefined,
        "",
      );
      /*TODO - Make this work with other projections*/
      const wfsFeatureInfoRequest = new WFS().writeGetFeature({
        srsName: "EPSG:3857",
        featureTypes: [this.layerSourceName],
        featureNS: featureDescription.targetNamespace,
        featurePrefix: featureDescription.targetPrefix,
        count: 1,
        maxFeatures: 1,
      });
      const getFeatureCapability = serverCapabilities.capabilities.filter(
        (c) => c.type === CapabilityType.WFS_GetFeature,
      )[0];
      const request: FeatureQueryRequest = {
        layer: undefined,
        wfsRequest: wfsFeatureInfoRequest,
        searchUrl: getFeatureCapability.url,
        searchMethod: getFeatureCapability.method,
      };
      const resp = await this.getFeatureInfoForLayer(request);

      const props = resp.features[0].getProperties();
      if (props) {
        this._cachedExampleFeature = props;
      }
      return props;
    }
    return null;
  }

  private getFeatureInfoForLayer(
    request: FeatureQueryRequest,
  ): Promise<FeatureQueryResponse> {
    const abortController = new AbortController();
    const timer = window.setTimeout(() => abortController.abort(), 10000);
    const promise = new Promise<FeatureQueryResponse>((resolve, reject) => {
      const fetchUrl = request.searchUrl;

      fetch(fetchUrl, {
        method: request.wfsRequest ? "POST" : "GET",
        mode: "cors",
        headers: { "Content-Type": "application/vnd.ogc.gml" },
        body: request.wfsRequest
          ? new XMLSerializer().serializeToString(request.wfsRequest)
          : null,
        signal: abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.text();
        })
        .then((data) => {
          const features = new GML3().readFeatures(data);

          const response: FeatureQueryResponse = {
            layer: request.layer,
            features: features,
          };

          resolve(response);
        })
        .catch((error) => {
          console.error(error);
          reject(
            `Failed to get feature info for layer ${request.layer.get("name")}`,
          );
        })
        .finally(() => {
          window.clearTimeout(timer);
        });
    });

    return promise;
  }

  private setTemplateVisibility() {
    const checkbox = document.querySelector(
      "input[data-queryable-check]",
    ) as HTMLInputElement;
    if (checkbox.checked) {
      document.getElementById("info-templates").style.display = "";
    } else {
      document.getElementById("info-templates").style.display = "none";
    }
  }

  private getProxyEndpoint() {
    const proxyMetaInput = document.querySelector(
      "input[data-proxy-meta]",
    ) as HTMLInputElement;
    if (proxyMetaInput.checked) {
      return this.proxyEndpoint;
    }
    return "";
  }
  private insertAtCaret(
    text: string,
    el: HTMLInputElement | HTMLTextAreaElement,
  ) {
    const [start, end] = [el.selectionStart, el.selectionEnd];
    el.setRangeText(text, start, end, "end");
    el.focus();
  }
}
