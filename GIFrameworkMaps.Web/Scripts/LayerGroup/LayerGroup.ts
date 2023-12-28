import { GIFWMap } from "../Map";
import * as olLayer from "ol/layer";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { Layer } from "../Interfaces/Layer";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

export interface LayerGroup {
    gifwMapInstance: GIFWMap;
    olLayerGroup: olLayer.Group;
    layerGroupType: LayerGroupType;
    layers: Layer[] | VectorLayer<any>[];
    createLayersGroup: () => olLayer.Group;
    addChangeEvents: () => void;
    addLayerToGroup: (layer: Layer | VectorLayer<VectorSource>, olLayer?: olLayer.Layer<any, any>) => void;
}