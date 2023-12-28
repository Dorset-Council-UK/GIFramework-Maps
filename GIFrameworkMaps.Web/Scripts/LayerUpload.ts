import VectorSource from "ol/source/Vector";
import { GPX, GeoJSON, IGC, KML, TopoJSON } from 'ol/format';
import { GIFWMap } from "./Map";
import { containsExtent, extend, Extent } from "ol/extent";
import VectorLayer from "ol/layer/Vector";
import { Feature } from "ol";
import { Alert, AlertSeverity, AlertType, CustomError, File as FileHelper, Browser as BrowserHelper } from "./Util";

export class LayerUpload {
    dropTarget: HTMLElement;
    inputTarget: HTMLInputElement;
    gifwMapInstance: GIFWMap;
    onCompleteCallback: () => void;
    maxFileSize: number;
    constructor(gifwMapInstance: GIFWMap, dropTarget?: HTMLElement | string, inputTarget?: HTMLInputElement | string, onCompleteCallback?: () => void, maxFileSize:number = 50) {
        if (dropTarget) {
            if (typeof dropTarget === "string") {
                this.dropTarget = document.getElementById(dropTarget);
            } else {
                this.dropTarget = dropTarget;
            }
        }
        if (inputTarget) {
            if (typeof inputTarget === "string") {
                this.inputTarget = document.getElementById(inputTarget) as HTMLInputElement;
            } else {
                this.inputTarget = inputTarget;
            }
        }
        this.onCompleteCallback = onCompleteCallback;
        this.maxFileSize = maxFileSize;
        this.gifwMapInstance = gifwMapInstance;
        this.init();
    }

    private init() {
        if (this.dropTarget) {
            this.dropTarget.addEventListener('dragover', e => this.dragOverHandler(e));
            this.dropTarget.addEventListener('dragenter', e => this.dragOverHandler(e));
            this.dropTarget.addEventListener('dragleave', e => this.dragLeaveHandler(e));
            this.dropTarget.addEventListener('dragend', e => this.dragLeaveHandler(e));
            this.dropTarget.addEventListener('drop', e => this.dragLeaveHandler(e));
            this.dropTarget.addEventListener('drop', e => this.dropHandler(e));
        }
        if (this.inputTarget) {
            this.inputTarget.addEventListener('change', e => { this.inputHandler(e) });
        }
    }

    /**
     * Handles the 'drop' event and passes the files to the processFiles function
     * 
     * @param ev{DragEvent} The event that was triggered
     * @returns void
     */
    private dropHandler(ev: DragEvent): void {

        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();
        const files: File[] = [];
        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            for (let i = 0; i < ev.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (ev.dataTransfer.items[i].kind === 'file') {
                    const file = ev.dataTransfer.items[i].getAsFile();
                    files.push(file);
                }
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            for (let i = 0; i < ev.dataTransfer.files.length; i++) {
                files.push(ev.dataTransfer.files[i]);
            }
        }
        this.processFiles(files);
    }

    /**
     * Adds the dragover class to the dropzone element
     * 
     * @param ev{DragEvent} The event that was triggered
     * @returns void
     */
    private dragOverHandler(ev: DragEvent) {
        // Prevent default behavior (Prevent file from being opened)
        this.dropTarget.classList.add('dragover');
        ev.preventDefault();

    }

    /**
     * Removes the dragover class to the dropzone element
     *
     * @param ev{DragEvent} The event that was triggered
     * @returns void
     */
    private dragLeaveHandler(ev: DragEvent) {
        // Prevent default behavior (Prevent file from being opened)
        this.dropTarget.classList.remove('dragover');
        ev.preventDefault();

    }

    /**
     * Handles the input change event for file inputs and passes the files to the processFiles function
     *
     * @param ev{Event} The event that was triggered
     * @returns void
     */
    private inputHandler(ev: Event) {
        const files = (<HTMLInputElement>ev.target).files;
        this.processFiles(Array.from(files));

    }

    /**
     * Processes the files that have been added
     * 
     * @param files{File[]} The list of files to process
     * @returns void
     */
    private processFiles(files: File[]) {
        if (files.length !== 0) {

            const failures: string[] = [];
            const promises: Promise<VectorLayer<VectorSource>>[] = [];
            files.forEach(f => {
                const format = this.getFormatFromFile(f);
                if (format && this.validateFileSize(f)) {
                    const reader = this.getFileReaderForFile(f);
                    const readerPromise = new Promise<VectorLayer<VectorSource>>((resolve, reject) => {
                        reader.addEventListener('load', e => {
                            try {
                                const result = (e.currentTarget as FileReader).result;
                                const added_layer = this.createAndAddLayerFromFile(result, format, FileHelper.getFileNameWithoutExtension(f.name));
                                if (this.validateAddedLayer(added_layer)) {
                                    resolve(added_layer);
                                } else {
                                    this.gifwMapInstance.removeLayerById(added_layer.get('layerId'));
                                    reject(`Couldn't add file ${FileHelper.getFileNameWithoutExtension(f.name)} because it appears to be invalid`);
                                }
                                    
                            } catch (ex) {
                                console.error(ex);
                                reject(`There was an unexpected problem processing file ${FileHelper.getFileNameWithoutExtension(f.name)}`);
                            }
                        })
                    });
                    if (format.getType() === "arraybuffer") {
                        reader.readAsArrayBuffer(f);
                    } else {
                        reader.readAsText(f);
                    }
                    promises.push(readerPromise);
                } else {
                    if (!this.validateFileSize(f)) {
                        failures.push(`Couldn't add file ${FileHelper.getFileNameWithoutExtension(f.name)} because it's too big (Max: ${this.maxFileSize}MB, Your file: ${(f.size /1024 / 1024).toFixed(2)}MB)`);

                    } else {
                        failures.push(`Couldn't add file ${FileHelper.getFileNameWithoutExtension(f.name)} because we don't know how to process ${FileHelper.getExtension(f.name)} files`);
                    
                    }
                    
                }
            });
            if (this.onCompleteCallback) {
                this.onCompleteCallback();
            }
            const processingToast = new Alert(
                AlertType.Toast,
                AlertSeverity.Info,
                `Layers being processed`,
                `Your layers are being processed`,
                '#gifw-error-toast');
            processingToast.show();

            Promise.allSettled(promises).then((layersPromise) => {
                const addedLayers: VectorLayer<VectorSource>[] = [];
                let totalNewExtent: Extent;
                layersPromise.forEach(lp => {
                    if (lp.status === "fulfilled") {
                        addedLayers.push(lp.value);
                        if (totalNewExtent) {
                            totalNewExtent = extend(totalNewExtent, lp.value.getSource().getExtent());
                        } else {
                            totalNewExtent = lp.value.getSource().getExtent();
                        }
                    } else {
                        failures.push(lp.reason);
                    }
                });

                if (addedLayers.length !== 0) {
                    let layerOutsideBounds = false;
                    if (!this.gifwMapInstance.isExtentAvailableInCurrentMap(totalNewExtent)) {

                        layerOutsideBounds = true;
                    }

                    const completeToast = new Alert(AlertType.Toast,
                        AlertSeverity.Info,
                        `👍 Layer${addedLayers.length !== 1 ? "s" : ""} added`,
                        `${addedLayers.length === 1 ? `'${addedLayers[0].get('name')}' has` : `${addedLayers.length} layers have`} been added to the map. You can find ${addedLayers.length === 1 ? "it" : "them"} in the Layers panel, under 'My Layers'. <a href="#" data-gifw-zoom-to-extent>Zoom to extent of ${addedLayers.length === 1 ? "layer" : "all added layers"}</a>`,
                        '#gifw-error-toast');
                    completeToast.show();
                    const zoomToLink = completeToast.errorElement.querySelector('a[data-gifw-zoom-to-extent]');
                    zoomToLink.addEventListener('click', e => {
                        e.preventDefault();
                        const curExtent = this.gifwMapInstance.olMap.getView().calculateExtent();
                        if (this.gifwMapInstance.isExtentAvailableInCurrentMap(totalNewExtent)) {
                            if (!BrowserHelper.PrefersReducedMotion() && containsExtent(curExtent, totalNewExtent)) {
                                this.gifwMapInstance.olMap.getView().fit(totalNewExtent, { padding: [50, 50, 50, 50], duration: 1000 });
                            } else {
                                this.gifwMapInstance.olMap.getView().fit(totalNewExtent, { padding: [50, 50, 50, 50] });
                            }
                            completeToast.hide();
                        } else {
                            const errDialog = new CustomError
                                (
                                    AlertType.Popup,
                                    AlertSeverity.Danger,
                                    "Layer is outside bounds of map",
                                    "<p>One or more of the layers you added is outside the current max bounds of your background map.</p><p>We've added the layers to the map, but you'll need to choose a different background map to view them.</p>"
                                )
                            errDialog.show();
                        }

                    });

                    if (addedLayers.length !== files.length) {
                        //one or more files were not added
                        let errorInfo: string = "";
                        failures.forEach(f => {
                            errorInfo += `<li>${f}</li>`;
                        })
                        let content = `<p>One or more of the layers you added could not be processed.</p><ul>${errorInfo}</ul>`;
                        if (layerOutsideBounds) {
                            content += `<p>Also, one or more of the layers you added is outside the current max bounds of your background map.</p><p>We've added the layers to the map, but you'll need to choose a different background map to view them.`
                        }


                        const errDialog = new CustomError
                            (
                                AlertType.Popup,
                                AlertSeverity.Danger,
                                "Some layers were not added",
                                content
                            )
                        errDialog.show();
                    } else {
                        if (layerOutsideBounds) {
                            const errDialog = new CustomError
                                (
                                    AlertType.Popup,
                                    AlertSeverity.Danger,
                                    "Layer is outside bounds of map",
                                    "<p>One or more of the layers you added is outside the current max bounds of your background map.</p><p>We've added the layers to the map, but you'll need to choose a different background map to view them.</p>"
                                )
                            errDialog.show();
                        }
                    }
                } else {
                    //no layers added
                    processingToast.hide();
                    let errorInfo: string = "";
                    failures.forEach(f => {
                        errorInfo += `<li>${f}</li>`;
                    })
                    const errDialog = new CustomError
                        (
                            AlertType.Popup,
                            AlertSeverity.Danger,
                            "None of your layers were added",
                            `<p>None of your layers could be added to the map.</p><ul>${errorInfo}</ul>`
                        )
                    errDialog.show();
                }
            })
        }
    }
    private validateFileSize(f: File) {
        const sizeInMB:number = (f.size / 1024 / 1024);
        return (sizeInMB <= this.maxFileSize);
    }

    private getFileReaderForFile(file:File) {
        const reader = new FileReader();

        const format = this.getFormatFromFile(file);

        if (format) {
            return reader;
                
        } else {
            return null;
        }
        
    }

    private createLayerSourceFromFile(fileContents: string | ArrayBuffer, format: KML | GPX | GeoJSON | TopoJSON | IGC) {
        const view = this.gifwMapInstance.olMap.getView();
        const projection = view.getProjection();
        const features = format.readFeatures(fileContents, { featureProjection: projection });
        const source = new VectorSource({
            format: format,
            features: features
        })
        return source;
    }

    /**
     * Creates a layer from file contents and adds it to the map
     * 
     * @param result - The string or ArrayBuffer representation of the file contents
     * @param format - The OpenLayers format the data should be read in
     * @param fileName - The name of the file with the extension
     * 
     * @returns void
     */
    private createAndAddLayerFromFile(result: string | ArrayBuffer, format: KML | GPX | GeoJSON | TopoJSON | IGC, fileName: string) {
        
        const source = this.createLayerSourceFromFile(result, format);
        
        return this.gifwMapInstance.addNativeLayerToMap(source as VectorSource<Feature>, fileName);

    }

    private getFormatFromFile(file: File) {
        const fileType = FileHelper.getExtension(file.name);
        let format: KML | GPX | GeoJSON | TopoJSON | IGC;
        switch (fileType) {
            case "kml":
                format = new KML({ extractStyles: true });
                break;
            case "gpx":
                format = new GPX();
                break;
            case "geojson":
                format = new GeoJSON();
                break;
            case "topojson":
            case "json":
                format = new TopoJSON();
                break;
            case "igc":
                format = new IGC();
                break;
            
        }
        return format;
    }

    private validateAddedLayer(layer: VectorLayer<VectorSource>): boolean {
        /*add any further validation tests here*/
         if (layer.getSource().getFeatures().length === 0) {
             return false;
        }
        if (layer.getSource().getExtent()[0] === Infinity) {
            return false;
        }
        return true;
    }
}


