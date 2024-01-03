import { Feature } from "ol";
import { Coordinate } from "ol/coordinate";
import { Geometry } from "ol/geom";
import { Layer } from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import RenderFeature from "ol/render/Feature";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { FeatureQueryResponse } from "../Interfaces/FeatureQuery/FeatureQueryResponse";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { GIFWMap } from "../Map";
import { GIFWPopupAction } from "../Popups/PopupAction";
import { GIFWPopupOptions } from "../Popups/PopupOptions";
import { Helper } from "../Util";
import { FeaturePropertiesHelper } from "./FeaturePropertiesHelper";
import { FeatureQueryTemplateHelper } from "./FeatureQueryTemplateHelper";
import { Source } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";

export class FeatureQueryResultRenderer {
  _gifwMapInstance: GIFWMap;
  _highlighterLayer: VectorLayer<VectorSource>;
  _vectorSource: VectorSource<Feature>;
  _highlightStyle: Style;

  constructor(gifwMapInstance: GIFWMap) {
    this._gifwMapInstance = gifwMapInstance;
    FeatureQueryTemplateHelper.configureNunjucks();

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
      if (
        (
          this._highlighterLayer.getSource() as VectorSource<Feature>
        ).getFeatures().length === 0
      ) {
        this._highlighterLayer.setVisible(false);
      } else {
        this._highlighterLayer.setVisible(true);
      }
    });
  }

  public showFeaturePopup(
    coords: number[],
    layer: Layer<Source, LayerRenderer<VectorLayer<VectorSource>>>,
    feature: Feature<Geometry> | RenderFeature,
    parentResponses?: FeatureQueryResponse[],
  ) {
    let popupOptions: GIFWPopupOptions;
    if (layer instanceof VectorLayer) {
      const popupActions: GIFWPopupAction[] = [];
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
      if (feature.get("gifw-popup-opts") !== undefined) {
        popupOptions = feature.get("gifw-popup-opts") as GIFWPopupOptions;
        if (popupOptions.actions) {
          popupOptions.actions = [
            ...popupOptions.actions.filter((a) => a.fixed),
            ...popupActions,
          ];
        }
      } else {
        const content = this.getPopupContentFromFeature(feature, null, layer);
        popupOptions = new GIFWPopupOptions(content, popupActions, [0, 0]);
      }
    } else {
      //get layer template
      const layerId = layer.get("layerId");
      const gifwLayer = this._gifwMapInstance.getLayerConfigById(layerId, [
        LayerGroupType.Overlay,
      ]);

      const props = feature.getProperties();
      let popupContent = "";
      try {
        if (!gifwLayer.infoTemplate) {
          //use generic template
          let genericTemplate = "";
          const keys = Helper.getKeysFromObject(props);

          keys.forEach((k) => {
            const value = Helper.getValueFromObjectByKey(props, k);
            if (
              FeaturePropertiesHelper.isUserDisplayablePropertyAndValue(
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
              FeaturePropertiesHelper.getMostAppropriateTitleFromProperties(
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
        }
        popupContent = FeatureQueryTemplateHelper.renderTemplate(
          gifwLayer.infoTemplate,
          props,
        );
        const popupActions: GIFWPopupAction[] = [];
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
      } catch (ex) {
        console.error(ex);
        popupContent = `<p>Something went wrong displaying this feature.</p><p>Please try again later, and let us know if the problem persists.</p>`;
      }
    }
    this.renderPopupFromOptions(popupOptions, coords);
    this.highlightFeature(feature);
    this._gifwMapInstance.popupOverlay.overlay.once("change:position", () =>
      this.unhighlightFeatures(),
    );
  }

  public showFeatureArrayPopup(
    coords: number[],
    responsesWithData: FeatureQueryResponse[],
  ) {
    const popupContent = document.createElement("div");
    popupContent.className = "gifw-result-list";
    const popupHeader = "<h1>Search results</h1>";
    popupContent.innerHTML = popupHeader;
    responsesWithData.forEach((r) => {
      const layerId = r.layer.get("layerId");
      const gifwLayer = this._gifwMapInstance.getLayerConfigById(layerId, [
        LayerGroupType.Overlay,
      ]);
      const layerHeader = document.createElement("h2");
      layerHeader.textContent = r.layer.get("name");
      popupContent.append(layerHeader);
      const featureList = document.createElement("ul");
      featureList.className = "list-unstyled";

      r.features.forEach((f) => {
        const listItem = document.createElement("li");
        let listItemContent = "";
        if (f.get("gifw-popup-title")) {
          //attempt to get a suitable title for this vector feature
          listItemContent = f.get("gifw-popup-title");
        } else if (gifwLayer) {
          listItemContent = FeatureQueryTemplateHelper.renderTemplate(
            gifwLayer.infoListTitleTemplate,
            f.getProperties(),
          );
        }

        if (listItemContent === "") {
          const titleProperty =
            FeaturePropertiesHelper.getMostAppropriateTitleFromProperties(
              f.getProperties(),
            );
          if (titleProperty) {
            listItemContent = Helper.getValueFromObjectByKey(
              f.getProperties(),
              titleProperty,
            ) as string;
          } else {
            //fall back to first property
            const firstProp =
              FeaturePropertiesHelper.getFirstAllowedPropertyFromProperties(
                f.getProperties() as object[],
              );
            listItemContent = firstProp[1].toString();
          }
        }

        const listItemLink = document.createElement("a");
        listItemLink.text = listItemContent;
        listItemLink.href = "#";
        listItemLink.addEventListener("click", () => {
          this.showFeaturePopup(coords, r.layer, f, responsesWithData);
        });
        listItem.appendChild(listItemLink);
        featureList.appendChild(listItem);
      });
      popupContent.append(featureList);
    });

    const popupOptions = new GIFWPopupOptions(popupContent, [], [0, 0]);
    this.renderPopupFromOptions(popupOptions, coords);
    this.highlightFeatures(responsesWithData.map((r) => r.features).flat());

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
    feature: Feature<Geometry> | RenderFeature,
    featureOpts: GIFWPopupOptions,
    layer: Layer<Source, LayerRenderer<VectorLayer<VectorSource>>>,
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
        (feature as Feature<Geometry>).getKeys().forEach((k) => {
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

  public highlightFeature(feature: Feature<Geometry> | RenderFeature) {
    this.unhighlightFeatures();
    this._highlighterLayer.getSource().addFeature(feature as Feature);
  }

  public highlightFeatures(features: (Feature<Geometry> | RenderFeature)[]) {
    this.unhighlightFeatures();
    this._highlighterLayer.getSource().addFeatures(features as Feature[]);
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
}
