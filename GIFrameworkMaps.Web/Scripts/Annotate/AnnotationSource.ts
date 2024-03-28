import Feature from "ol/Feature";
import { Geometry } from "ol/geom";
import VectorSource from "ol/source/Vector";
import { Options } from "ol/source/Vector";

export default class AnnotationSource extends VectorSource<Feature<Geometry>> {
  constructor(options: Options<Feature> = { wrapX: false }) {
    super(options);
  }
}
