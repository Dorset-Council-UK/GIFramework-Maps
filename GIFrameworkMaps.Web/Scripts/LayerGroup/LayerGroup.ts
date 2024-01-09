import { GIFWMap } from "../Map";
import * as olLayer from "ol/layer";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer } from "../Interfaces/Layer";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Source } from "ol/source";
import LayerRenderer from "ol/renderer/Layer";
import { Feature } from "ol";
import { Geometry } from "ol/geom";

export interface LayerGroup {
  gifwMapInstance: GIFWMap;
  olLayerGroup: olLayer.Group;
  layerGroupType: LayerGroupType;
  layers: Layer[] | VectorLayer<VectorSource<Feature<Geometry>>>[];
  createLayersGroup: () => olLayer.Group;
  addChangeEvents: () => void;
  addLayerToGroup: (
    layer: Layer | VectorLayer<VectorSource>,
    olLayer?: olLayer.Layer<Source, LayerRenderer<olLayer.Layer>>,
  ) => void;
}
