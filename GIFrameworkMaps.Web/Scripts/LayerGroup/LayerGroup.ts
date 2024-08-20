import { GIFWMap } from "../Map";
import * as olLayer from "ol/layer";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer } from "../Interfaces/Layer";
import { Vector as VectorLayer } from "ol/layer";
import { Source } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";

export interface LayerGroup {
  gifwMapInstance: GIFWMap;
  olLayerGroup: olLayer.Group;
  layerGroupType: LayerGroupType;
  layers: Layer[] | VectorLayer[];
  createLayersGroup: () => Promise<olLayer.Group> | olLayer.Group;
  addChangeEvents: () => void;
  addLayerToGroup: (
    layer: Layer | VectorLayer,
    olLayer?: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>,
  ) => void;
}
