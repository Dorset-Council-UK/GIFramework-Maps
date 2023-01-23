import Geometry from "ol/geom/Geometry";
import VectorSource from "ol/source/Vector";
import { Options } from "ol/source/VectorTile";

export default class AnnotationSource extends VectorSource<Geometry> {

    constructor(options: Options = { wrapX: false }) {
        super(options);
    }

}