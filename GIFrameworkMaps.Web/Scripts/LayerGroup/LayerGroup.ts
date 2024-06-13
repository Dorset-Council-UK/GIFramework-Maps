import { GIFWMap } from "../Map";
import * as olLayer from "ol/layer";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer } from "../Interfaces/Layer";
import { Vector as VectorLayer } from "ol/layer";
import { Source } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";
import { Feature } from "ol";
import { Geometry } from "ol/geom";

export interface LayerGroup {
  gifwMapInstance: GIFWMap;
  olLayerGroup: olLayer.Group;
  layerGroupType: LayerGroupType;
  layers: Layer[] | VectorLayer<Feature<Geometry>>[];
  createLayersGroup: () => Promise<olLayer.Group> | olLayer.Group;
  addChangeEvents: () => void;
  addLayerToGroup: (
    layer: Layer | VectorLayer<Feature<Geometry>>,
    olLayer?: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>,
  ) => void;
}
