import { GIFWMap } from "../Map";
import * as olLayer from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import { LayerGroupType } from "../Interfaces/LayerGroupType";
import { LayerGroup } from "./LayerGroup";

export class NativeLayerGroup implements LayerGroup {
    layers: VectorLayer<any>[];
    gifwMapInstance: GIFWMap;
    olLayerGroup: olLayer.Group;
    layerGroupType: LayerGroupType;

    constructor(layers: VectorLayer<any>[], gifwMapInstance: GIFWMap, layerGroupType: LayerGroupType) {
        this.layers = layers;
        this.gifwMapInstance = gifwMapInstance;
        this.layerGroupType = layerGroupType;

        this.olLayerGroup = this.createLayersGroup();
        this.addChangeEvents();
    }

    /**
    * Creates a 'group' of layers (overlay or basemap) for use in OpenLayers
    *
    * @returns olLayer.Group
    *
    */
    createLayersGroup(): olLayer.Group {
        const ol_layers: Array<any> = [];
        const lgType = this.layerGroupType;
        if (this.layers !== null) {
            this.layers.forEach(function (layer) {
                layer.setProperties({ "layerGroupType": lgType })

                ol_layers.push(layer);
            });
        }
        const layerGroup = new olLayer.Group({
            layers: ol_layers
        });
        layerGroup.setProperties({ "type": this.layerGroupType });
        
        return layerGroup;
    }

    /**
    * Adds the basic change events required on all types of layer
    *
    * @returns void
    *
    */
    addChangeEvents(): void {
        this.olLayerGroup.getLayers().forEach(l => {
            l.on('change:visible', e => {
                document.getElementById(this.gifwMapInstance.id).dispatchEvent(new CustomEvent('gifw-update-permalink'));
                //we only want to trigger this when its made visible, not when its hidden
                if (e.oldValue === false) {
                    l.set('hasBeenOpened', true);
                }
            });
        })

    }

    addLayerToGroup(layer: VectorLayer<any>): void {
        layer.setProperties({ "layerGroupType": this.layerGroupType})
        this.layers.push(layer);
        const newLayerGroup = this.olLayerGroup.getLayers();
        newLayerGroup.push(layer);
        this.olLayerGroup.setLayers(newLayerGroup);
    }
}
