import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { Layer } from "ol/layer";
import { Vector as VectorLayer } from "ol/layer";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { FeatureQueryResponse } from "../Interfaces/FeatureQuery/FeatureQueryResponse";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { GIFWMap } from "../Map";
import { GIFWPopupAction } from "../Popups/PopupAction";
import { GIFWPopupOptions } from "../Popups/PopupOptions";
import { getKeysFromObject, getValueFromObjectByKey } from "../Util";
import { isUserDisplayablePropertyAndValue, getMostAppropriateTitleFromProperties, getFirstAllowedPropertyFromProperties } from "./FeaturePropertiesHelper";
import { configureNunjucks, renderTemplate } from "./FeatureQueryTemplateHelper";
import { Source } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";
import { showMetadataModal } from "../Metadata/MetadataViewer";

export class FeatureQueryResultRenderer {
  _gifwMapInstance: GIFWMap;
  _highlighterLayer: VectorLayer;
  _vectorSource: VectorSource<Feature>;
  _highlightStyle: Style;

  constructor(gifwMapInstance: GIFWMap) {
    this._gifwMapInstance = gifwMapInstance;
    configureNunjucks();

    //add highlighted features layer
    this._highlightStyle = new Style({
      stroke: new Stroke({
        color: `rgb(0,255,255)`,
        width: 2,
      }),
      image: new CircleStyle({
        radius: 8,
        stroke: new Stroke({
          color: `rgb(0,255,255)`,
          width: 3,
        }),
      }),
    });
    this._vectorSource = new VectorSource();

    this._highlighterLayer = this._gifwMapInstance.addNativeLayerToMap(
      this._vectorSource,
      "Feature Highlights",
      this._highlightStyle,
      false,
      LayerGroupType.SystemNative,
      9999,
      false,
    );
    this._highlighterLayer.on("change", () => {
      if (this._highlighterLayer.getSource().getFeatures().length === 0) {
        this._highlighterLayer.setVisible(false);
      } else {
        this._highlighterLayer.setVisible(true);
      }
    });
  }

  /**
   * Displays the feature information popup at the specified coords
   * Will use either a predefined template or feature properties as appropriate
   * @param coords Where to place the feature popup
   * @param layer The layer this feature popup relates to
   * @param feature The feature to show information for
   * @param parentResponses Optional array of other features queried that the user can go back to
   */
  public async showFeaturePopup(
    coords: number[],
    layer: Layer<Source, LayerRenderer<VectorLayer>>,
    feature: Feature,
    parentResponses?: FeatureQueryResponse[],
  ) {
    let popupOptions: GIFWPopupOptions;
    let popupActions: GIFWPopupAction[] = [];
    if (feature.getGeometry()) {
      popupActions.push(
        new GIFWPopupAction(
          "Zoom to feature",
          () => {
            this._gifwMapInstance.zoomToFeature(feature);
          },
          false,
          false,
        ),
      );
    }

    //get layer template
    const layerId = layer.get("layerId");
    const gifwLayer = this._gifwMapInstance.getLayerConfigById(layerId, [
      LayerGroupType.Overlay,
    ]);
    let popupContent: string | Element;
    const props = feature.getProperties();

    if (gifwLayer) {
      //this indicates that it must be an overlay and will have the about this layer available
      popupActions.push(new GIFWPopupAction("About this layer", () => {
        showMetadataModal(gifwLayer, layer, this._gifwMapInstance)
      }, false, false))
    }
    if (gifwLayer && !gifwLayer.infoTemplate) {
      gifwLayer.infoTemplate = await this.getTemplateForLayer(layerId);
    }

    if (!gifwLayer?.infoTemplate) {
      if (feature.get("gifw-popup-opts") !== undefined) {
        popupOptions = feature.get("gifw-popup-opts") as GIFWPopupOptions;
        if (popupOptions.actions) {
          popupActions = [
            ...popupOptions.actions.filter((a) => a.fixed),
            ...popupActions
          ]
        }
        if (popupOptions.content) {
          popupContent = popupOptions.content;
        }
      } else {
        popupContent = this.getPopupContentFromFeature(feature, null, layer);
      }
      //no template, check feature props then fallback to generic template
      if (!popupContent) {
        //use generic template
        let genericTemplate = "";
        const keys = getKeysFromObject(props);

        keys.forEach((k) => {
          const value = getValueFromObjectByKey(props, k);
          if (
            isUserDisplayablePropertyAndValue(
              k,
              value,
            )
          ) {
            genericTemplate += `<tr><th>${k}</th><td>{{${k}}}</td>`;
          }
        });
        if (genericTemplate !== "") {
          genericTemplate = `<table class="table table-sm"><tbody>${genericTemplate}</tbody></table>`;
          const titleProperty =
            getMostAppropriateTitleFromProperties(
              props,
            );
          if (titleProperty) {
            genericTemplate = `<h1>{{${titleProperty}}}</h1>${genericTemplate}`;
          } else {
            genericTemplate = `<h1>${layer.get(
              "name",
            )}</h1>${genericTemplate}`;
          }

          gifwLayer.infoTemplate = genericTemplate;
        } else {
          throw new Error(
            "Template could not be determined or automatically setup",
          );
        }
        popupContent = renderTemplate(
          gifwLayer.infoTemplate,
          props,
        );
      }
    } else {
      //has template
      popupContent = renderTemplate(
        gifwLayer.infoTemplate,
        props,
      );
    }


    if (parentResponses) {
      popupActions.push(
        new GIFWPopupAction(
          "Back to list of results",
          () => {
            this.showFeatureArrayPopup(coords, parentResponses);
          },
          false,
          false,
        ),
      );
    }
    popupOptions = new GIFWPopupOptions(popupContent, popupActions, [0, 0]);

    this.renderPopupFromOptions(popupOptions, coords);
    this.highlightFeature(feature);
    this._gifwMapInstance.popupOverlay.overlay.once("change:position", () =>
      this.unhighlightFeatures(),
    );
  }

  public async showFeatureArrayPopup(
    coords: number[],
    responsesWithData: FeatureQueryResponse[],
  ) {
    const popupContent = document.createElement("div");
    popupContent.className = "gifw-result-list";
    const popupHeader = "<h1>Search results</h1>";
    popupContent.innerHTML = popupHeader;

    for (const r of responsesWithData) {
      const layerId = r.layer.get("layerId");
      const gifwLayer = this._gifwMapInstance.getLayerConfigById(layerId, [
        LayerGroupType.Overlay,
      ]);
      const layerHeader = document.createElement("h2");
      layerHeader.textContent = r.layer.get("name");
      popupContent.append(layerHeader);
      const featureList = document.createElement("ul");
      featureList.className = "list-unstyled";
      if (gifwLayer && !gifwLayer.infoListTitleTemplate) {
        gifwLayer.infoListTitleTemplate = await this.getListTitleTemplateForLayer(layerId);
      }

      for (const f of r.features) {
        const listItem = document.createElement("li");
        let listItemContent = "";
        if (f.get("gifw-popup-title")) {
          //attempt to get a suitable title for this vector feature
          listItemContent = f.get("gifw-popup-title");
        } else if (gifwLayer) {
          listItemContent = renderTemplate(
            gifwLayer.infoListTitleTemplate,
            f.getProperties(),
          );
        }

        if (listItemContent === "") {
          const titleProperty =
            getMostAppropriateTitleFromProperties(
              f.getProperties(),
            );
          if (titleProperty) {
            listItemContent = getValueFromObjectByKey(
              f.getProperties(),
              titleProperty,
            ) as string;
          } else {
            //fall back to first property
            const firstProp =
              getFirstAllowedPropertyFromProperties(
                f.getProperties() as object[],
              );
            if (firstProp !== undefined) {
              listItemContent = firstProp[1].toString();
            } else {
              //no properties available, just give them a generic title
              listItemContent = "A feature (no data properties available)"
            }
          }
        }

        const listItemLink = document.createElement("a");
        listItemLink.text = listItemContent;
        listItemLink.href = "#";
        listItemLink.addEventListener("click", (e) => {
            this.showFeaturePopup(coords, r.layer, f, responsesWithData);
          e.preventDefault();
        });
        listItem.appendChild(listItemLink);
        featureList.appendChild(listItem);
      }
      popupContent.append(featureList);
    }

    const popupOptions = new GIFWPopupOptions(popupContent, [], [0, 0]);
    this.renderPopupFromOptions(popupOptions, coords);
    this.highlightFeatures(responsesWithData.map((r) => r.features).flat() as Feature[]);

    this._gifwMapInstance.popupOverlay.overlay.once("change:position", () =>
      this.unhighlightFeatures(),
    );
  }

  private renderPopupFromOptions(
    popupOptions: GIFWPopupOptions,
    coords: number[],
  ) {
    const popup = this._gifwMapInstance.popupOverlay.overlay.getElement();

    if (typeof popupOptions.content === "string") {
      popup.querySelector("#gifw-popup-content").innerHTML =
        popupOptions.content;
    } else {
      popup.querySelector("#gifw-popup-content").innerHTML = "";
      popup
        .querySelector("#gifw-popup-content")
        .appendChild(popupOptions.content);
    }

    if (
      popupOptions &&
      popupOptions.actions !== undefined &&
      popupOptions.actions.length !== 0
    ) {
      const optionsListContainer = document.createElement("ul");
      optionsListContainer.className = "list-unstyled mb-0 mt-2 border-top";
      popupOptions.actions.forEach((action) => {
        const actionItem = document.createElement("li");
        const actionLink = document.createElement("a");
        actionLink.href = "#";
        actionLink.textContent = action.text;
        actionLink.addEventListener("click", (e) => {
          action.callback();
          if (action.closeOverlayOnClick) {
            this._gifwMapInstance.hidePopup();
          }
          e.preventDefault();
        });
        actionItem.appendChild(actionLink);
        optionsListContainer.appendChild(actionItem);
      });
      popup.querySelector("#gifw-popup-content").append(optionsListContainer);
    }
    this._gifwMapInstance.popupOverlay.overlay.setPosition(coords);
    this._gifwMapInstance.popupOverlay.overlay.panIntoView({
      margin: 90,
      animation: { duration: 250 },
    });
    if (popupOptions && popupOptions.offset !== undefined) {
      this._gifwMapInstance.popupOverlay.overlay.setOffset(popupOptions.offset);
    }
  }

  private getPopupContentFromFeature(
    feature: Feature,
    featureOpts: GIFWPopupOptions,
    layer: Layer<Source, LayerRenderer<VectorLayer>>,
  ): string {
    //default to name or layerName if available
    let featureContent = feature?.get("name") || layer?.get("name");
    //if a featureOpts has been supplied, this should contain the content
    if (featureOpts && featureOpts.content !== undefined) {
      featureContent = featureOpts.content;
    } else {
      //try and get the content from kml style name/description
      let kmlStyleContent = "";
      if (feature.get("name") || feature.get("_name")) {
        kmlStyleContent = `<h1>${
          feature.get("name") || feature.get("_name")
        }</h1>`;
      }
      if (feature.get("description")) {
        kmlStyleContent += feature.get("description");
      }

      if (kmlStyleContent !== "") {
        featureContent = kmlStyleContent;
      } else {
        //try and get content from keys
        let keysList = "";
        feature.getKeys().forEach((k) => {
          if (typeof feature.get(k) !== "object") {
            keysList += `<tr><th>${k}</th><td>${feature.get(k)}</td>`;
          }
        });
        if (keysList !== "") {
          keysList = `<table class="table table-sm"><tbody>${keysList}</tbody></table>`;
          if (feature.get("name") || layer.get("name")) {
            keysList = `<h1>${
              feature.get("name") || layer.get("name")
            }</h1>${keysList}`;
          }
          featureContent = keysList;
        }
      }
    }
    return featureContent;
  }

  public highlightFeature(feature: Feature) {
    this.unhighlightFeatures();
    this._highlighterLayer.getSource().addFeature(feature);
  }

  public highlightFeatures(features: Feature[]) {
    this.unhighlightFeatures();
    this._highlighterLayer.getSource().addFeatures(features);
  }

  public unhighlightFeatures() {
    this._highlighterLayer.getSource().clear();
  }

  public showNoFeaturesPopup(coords: number[]) {
    const popup = this._gifwMapInstance.popupOverlay.overlay.getElement();
    const popupContent = `<p>No features found at this location</p>`;

    popup.querySelector("#gifw-popup-content").innerHTML = popupContent;
    this._gifwMapInstance.popupOverlay.overlay.setPosition(coords);
    this._gifwMapInstance.popupOverlay.overlay.setOffset([0, 0]);
  }

  public showLoadingPopup(layerNames: string[], coords: Coordinate): void {
    const popup = this._gifwMapInstance.popupOverlay.overlay.getElement();
    let loadingContent = '<h1>Searching layers</h1><ul class="list-unstyled">';
    let namesCounter = 0;
    layerNames.some((name) => {
      loadingContent += `<li><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div> ${name}</li>`;
      namesCounter++;
      if (namesCounter >= 3) {
        const remainingLayers = layerNames.length - 3;
        if (remainingLayers > 0) {
          loadingContent += `<li>...and ${remainingLayers} more</li>`;
        }
        return true;
      }
    });
    loadingContent += "</ul>";
    popup.querySelector("#gifw-popup-content").innerHTML = loadingContent;
    this._gifwMapInstance.popupOverlay.overlay.setPosition(coords);
    this._gifwMapInstance.popupOverlay.overlay.setOffset([0, 0]);
  }

  private async getTemplateForLayer(layerId: number) {
    const resp = await fetch(
      `${document.location.protocol}//${this._gifwMapInstance.config.appRoot}API/InfoTemplate/${layerId}`,
    );

    if (!resp.ok) {
      throw new Error("Network response was not OK");
    } else {
      return resp.text();
    }
  }

  private async getListTitleTemplateForLayer(layerId: number) {
    const resp = await fetch(
      `${document.location.protocol}//${this._gifwMapInstance.config.appRoot}API/InfoListTitleTemplate/${layerId}`,
    );

    if (!resp.ok) {
      throw new Error("Network response was not OK");
    } else {
      return resp.text();
    }
  }
}
