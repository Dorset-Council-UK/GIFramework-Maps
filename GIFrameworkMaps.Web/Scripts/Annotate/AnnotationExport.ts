import { Modal } from "bootstrap";
import Feature from "ol/Feature";
import { GeoJSON, GPX, KML } from "ol/format";
import { Circle, Geometry } from "ol/geom";
import * as Polygon from "ol/geom/Polygon";
import { GIFWMap } from "../Map";

import AnnotationSource from "./AnnotationSource";
import AnnotationStyle from "./AnnotationStyle";


interface ExportFormat {
    extension: string,
    formatter: GeoJSON | GPX | KML,
    mediaType: string
}

export default class AnnotationExport {

    source: AnnotationSource;
    optionsContainer: HTMLDivElement;
    gifwMapInstance: GIFWMap;

    constructor(layer: AnnotationSource, gifwMapInstance: GIFWMap) {
        this.source = layer;
        this.gifwMapInstance = gifwMapInstance;
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.classList.add('modal', 'gifw-annotation-export-options');
        this.optionsContainer.tabIndex = -1;
        this.optionsContainer.innerHTML = `
            <div class="modal-dialog">
            <div class="modal-content">
                <form class="gifw-annotation-export-form" onsubmit="return false;">
                    <div class="modal-header">
                        <h5 class="modal-title">Export options</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <input required type="text" class="form-control gifw-annotation-export-title" placeholder="Enter a file name">
                        </div>
                        <select required class="form-select gifw-annotation-export-format" aria-label="File formats">
                            <option selected value="">Choose a file format</option>
                            <option value="GeoJSON">GeoJSON</option>
                            <option value="GPX">GPX (points and lines only)</option>
                            <option value="KML">KML</option>
                        </select>
                        <div class="form-text">
                            Only the KML file format supports style data and text labels, but support is limited. </br>
                            Be aware that your exported annotations may not look exactly as they are on this map. 
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="submit" class="btn btn-primary gifw-annotation-export-btn">Export</button>
                    </div>
                </form>
            </div>
            </div>
        `;
        let exportTitle = this.optionsContainer.querySelector<HTMLInputElement>('.gifw-annotation-export-title');
        let exportFormat = this.optionsContainer.querySelector<HTMLInputElement>('.gifw-annotation-export-format');
        let exportForm = this.optionsContainer.querySelector<HTMLFormElement>('.gifw-annotation-export-form');
        exportForm.addEventListener('submit', () => {
            this.run(exportFormat.value, exportTitle.value);
            let optionsModal = Modal.getOrCreateInstance(this.optionsContainer);
            optionsModal.hide();
        });
    }

    static formats: { [name: string]: ExportFormat } = {
        'GeoJSON': {
            extension: '.geojson',
            formatter: new GeoJSON(),
            mediaType: 'application/geo+json'
        },
        'GPX': {
            extension: '.gpx',
            formatter: new GPX(),
            mediaType: 'application/gpx+xml'
        },
        'KML': {
            extension: '.kml',
            formatter: new KML(), // Note: KML supports some style data, but dashed/dotted lines are not supported. (Feb 2022)
            mediaType: 'application/vnd.google-earth.kml+xml'
        }
    }

    public run(formatName: string = 'GeoJSON', title: string = 'Annotations') {
        let format = AnnotationExport.formats[formatName];
        if (!format) {
            alert('Unsupported file format chosen for export.');
            return;
        }
        let formatter = format.formatter;
        let features = this.source.getFeatures();
        let cleanedFeatures: Feature<Geometry>[] = [];
        features.forEach((f) => {
            let cleaned = f.clone();
            if (cleaned.hasProperties()) {
                Object.keys(cleaned.getProperties()).forEach((k) => {
                    if (k.startsWith('gifw')) {
                        cleaned.unset(k);
                    }
                });
            }
            let style = cleaned.getStyle();
            if (formatter instanceof GeoJSON && style instanceof AnnotationStyle && style.getText()?.getText()?.length > 0) {
                cleaned.setProperties({ 'name': style.getText().getText() });
            }
            let geometry = cleaned.getGeometry();
            if (geometry instanceof Circle) {
                let approximation = Polygon.fromCircle(geometry);
                cleaned.setGeometry(approximation); // GeoJSON & KML do not support Circle geometries
            }
            cleanedFeatures.push(cleaned);
        });
        let collection = formatter.writeFeatures(cleanedFeatures, {
            featureProjection: this.gifwMapInstance.olMap.getView().getProjection()
        });

        // Remove the default KML pushpin icon from features with labels (text annotations)
        if (formatter instanceof KML) {
            let parser = new DOMParser();
            let kml = parser.parseFromString(collection, 'application/xml');
            let placemarks = kml.querySelectorAll('Placemark');
            placemarks.forEach((p) => {
                let styleElement = p.querySelector('Style');
                if (styleElement) {
                    let labelStyleElement = styleElement.querySelector('LabelStyle');
                    if (labelStyleElement && !(styleElement.querySelector('IconStyle'))) {
                        labelStyleElement.insertAdjacentHTML('afterend', `<IconStyle><Icon></Icon></IconStyle>`);
                    }
                }
            });
            collection = kml.documentElement.innerHTML;
        }

        let blob = new Blob([collection], { type: format.mediaType });
        let url = URL.createObjectURL(blob);
        let downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${title}${format.extension}`;
        downloadLink.click();
    }

    public showOptions() {
        let optionsModal = Modal.getOrCreateInstance(this.optionsContainer);
        optionsModal.show();
    }

}
