import Feature from "ol/Feature";
import { Geometry } from "ol/geom";
import VectorSource from "ol/source/Vector";
import { Options } from "ol/source/VectorTile";

export default class AnnotationSource extends VectorSource<Feature<Geometry>> {

    constructor(options: Options = { wrapX: false }) {
        super(options);
    }

}