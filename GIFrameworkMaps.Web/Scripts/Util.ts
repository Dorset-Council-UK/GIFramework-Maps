import { Modal, Toast } from "bootstrap";
import { Circle, Fill, Stroke, Style as olStyle } from "ol/style";
import { Theme } from "./Interfaces/Theme";
import { GIFWMap } from "./Map";
import { toLonLat } from "ol/proj";
import { Layer as olLayer } from "ol/layer";
import { LayerGroupType } from "./Interfaces/LayerGroupType";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Point, SimpleGeometry } from "ol/geom";
import { GIFWPopupOptions } from "./Popups/PopupOptions";
import { ImageWMS, TileWMS } from "ol/source";

interface IPrefixArrayMember {
    xBase: number;
    yBase: number;
}
interface IPrefixArray {
    [prefix: string]: IPrefixArrayMember;
}
export namespace Util {
    export class Projection {

        static convertBNGToAlpha(x: number, y: number, includeSpaces?:boolean): string {
            //round to nearest whole
            x = Math.round(x);
            y = Math.round(y);
            //Get the alpha
            let xRounded = Math.floor(x / 100000) * 100000;
            let yRounded = Math.floor(y / 100000) * 100000;
            let alpha = '';
            for (var prefix in Util.Projection.prefixes) {
                if (Util.Projection.prefixes[prefix].xBase == xRounded && Util.Projection.prefixes[prefix].yBase == yRounded) {
                    alpha = prefix;
                }
            }

            if (alpha == '') {
                //Set the the parsed point
                return "Outside UK";

            } else {
                //Get the numeric part
                let easting: any = x - Util.Projection.prefixes[alpha].xBase;
                let northing: any = y - Util.Projection.prefixes[alpha].yBase;

                //To string
                let eastingAsString = easting.toString();
                let northingAsString = northing.toString();

                //Make up spaces
                var xPrefix = "";
                if (eastingAsString.length < 5) {
                    for (var i = 0; i < (5 - eastingAsString.length); i++) {
                        xPrefix += "0";
                    }
                }
                var yPrefix = "";
                if (northingAsString.length < 5) {
                    for (var i = 0; i < (5 - northingAsString.length); i++) {
                        yPrefix += "0";
                    }
                }

                //Combine back together
                let numeric = `${xPrefix}${eastingAsString}${includeSpaces ? ' ': ''}${yPrefix}${northingAsString}`;

                //Set the the parsed point
                return `${alpha}${includeSpaces ? ' ' : ''}${numeric}`
            }
        }
        private static prefixes: IPrefixArray = {
            'HL': { xBase: 0, yBase: 1200000 },
            'HQ': { xBase: 0, yBase: 1100000 },
            'HV': { xBase: 0, yBase: 1000000 },
            'NA': { xBase: 0, yBase: 900000 },
            'NF': { xBase: 0, yBase: 800000 },
            'NL': { xBase: 0, yBase: 700000 },
            'NQ': { xBase: 0, yBase: 600000 },
            'NV': { xBase: 0, yBase: 500000 },
            'SA': { xBase: 0, yBase: 400000 },
            'SF': { xBase: 0, yBase: 300000 },
            'SL': { xBase: 0, yBase: 200000 },
            'SQ': { xBase: 0, yBase: 100000 },
            'SV': { xBase: 0, yBase: 0 },
            'HM': { xBase: 100000, yBase: 1200000 },
            'HR': { xBase: 100000, yBase: 1100000 },
            'HW': { xBase: 100000, yBase: 1000000 },
            'NB': { xBase: 100000, yBase: 900000 },
            'NG': { xBase: 100000, yBase: 800000 },
            'NM': { xBase: 100000, yBase: 700000 },
            'NR': { xBase: 100000, yBase: 600000 },
            'NW': { xBase: 100000, yBase: 500000 },
            'SB': { xBase: 100000, yBase: 400000 },
            'SG': { xBase: 100000, yBase: 300000 },
            'SM': { xBase: 100000, yBase: 200000 },
            'SR': { xBase: 100000, yBase: 100000 },
            'SW': { xBase: 100000, yBase: 0 },
            'HN': { xBase: 200000, yBase: 1200000 },
            'HS': { xBase: 200000, yBase: 1100000 },
            'HX': { xBase: 200000, yBase: 1000000 },
            'NC': { xBase: 200000, yBase: 900000 },
            'NH': { xBase: 200000, yBase: 800000 },
            'NN': { xBase: 200000, yBase: 700000 },
            'NS': { xBase: 200000, yBase: 600000 },
            'NX': { xBase: 200000, yBase: 500000 },
            'SC': { xBase: 200000, yBase: 400000 },
            'SH': { xBase: 200000, yBase: 300000 },
            'SN': { xBase: 200000, yBase: 200000 },
            'SS': { xBase: 200000, yBase: 100000 },
            'SX': { xBase: 200000, yBase: 0 },
            'HO': { xBase: 300000, yBase: 1200000 },
            'HT': { xBase: 300000, yBase: 1100000 },
            'HY': { xBase: 300000, yBase: 1000000 },
            'ND': { xBase: 300000, yBase: 900000 },
            'NJ': { xBase: 300000, yBase: 800000 },
            'NO': { xBase: 300000, yBase: 700000 },
            'NT': { xBase: 300000, yBase: 600000 },
            'NY': { xBase: 300000, yBase: 500000 },
            'SD': { xBase: 300000, yBase: 400000 },
            'SJ': { xBase: 300000, yBase: 300000 },
            'SO': { xBase: 300000, yBase: 200000 },
            'ST': { xBase: 300000, yBase: 100000 },
            'SY': { xBase: 300000, yBase: 0 },
            'HP': { xBase: 400000, yBase: 1200000 },
            'HU': { xBase: 400000, yBase: 1100000 },
            'HZ': { xBase: 400000, yBase: 1000000 },
            'NE': { xBase: 400000, yBase: 900000 },
            'NK': { xBase: 400000, yBase: 800000 },
            'NP': { xBase: 400000, yBase: 700000 },
            'NU': { xBase: 400000, yBase: 600000 },
            'NZ': { xBase: 400000, yBase: 500000 },
            'SE': { xBase: 400000, yBase: 400000 },
            'SK': { xBase: 400000, yBase: 300000 },
            'SP': { xBase: 400000, yBase: 200000 },
            'SU': { xBase: 400000, yBase: 100000 },
            'SZ': { xBase: 400000, yBase: 0 },
            'JL': { xBase: 500000, yBase: 1200000 },
            'JQ': { xBase: 500000, yBase: 1100000 },
            'JV': { xBase: 500000, yBase: 1000000 },
            'OA': { xBase: 500000, yBase: 900000 },
            'OF': { xBase: 500000, yBase: 800000 },
            'OL': { xBase: 500000, yBase: 700000 },
            'OQ': { xBase: 500000, yBase: 600000 },
            'OV': { xBase: 500000, yBase: 500000 },
            'TA': { xBase: 500000, yBase: 400000 },
            'TF': { xBase: 500000, yBase: 300000 },
            'TL': { xBase: 500000, yBase: 200000 },
            'TQ': { xBase: 500000, yBase: 100000 },
            'TV': { xBase: 500000, yBase: 0 },
            'JM': { xBase: 600000, yBase: 1200000 },
            'JR': { xBase: 600000, yBase: 1100000 },
            'JW': { xBase: 600000, yBase: 1000000 },
            'OB': { xBase: 600000, yBase: 900000 },
            'OG': { xBase: 600000, yBase: 800000 },
            'OM': { xBase: 600000, yBase: 700000 },
            'OR': { xBase: 600000, yBase: 600000 },
            'OW': { xBase: 600000, yBase: 500000 },
            'TB': { xBase: 600000, yBase: 400000 },
            'TG': { xBase: 600000, yBase: 300000 },
            'TM': { xBase: 600000, yBase: 200000 },
            'TR': { xBase: 600000, yBase: 100000 },
            'TW': { xBase: 600000, yBase: 0 }
        }
    }

    export class Browser {
        static PrefersReducedMotion():Boolean {
            let reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
            if (!reduceMotionQuery) {
                //the media query is unavailable
                return false;
            } else {
                return reduceMotionQuery.matches;
            }
        }

        static extractParamsFromHash(hash: string): Record<string, string> {
            if (hash.startsWith('#')) { hash = hash.substring(1) };
            let hashParams: Record<string, string> = {}
            hash.split('&').map(hk => {
                //split method taken from https://stackoverflow.com/a/4607799/863487
                let hashParamKVP = hk.split(/=(.*)/s).slice(0, 2);
                if (hashParamKVP.length === 2) {
                    hashParams[hashParamKVP[0].toLowerCase()] = decodeURI(hashParamKVP[1])
                }
            });

            return hashParams;
        }

        /**
         * Checks to see if the specified storage type is available in the browser
         * @param type localStorage or sessionStorage
         */
        static storageAvailable(type:string): boolean {
            let storage: Storage;
            
            try {
                storage = window[type as any] as unknown as Storage;
                var x = '__storage_test__';
                storage.setItem(x, x);
                storage.removeItem(x);
                return true;
            }
            catch (e) {
                return e instanceof DOMException && (
                    // everything except Firefox
                    e.code === 22 ||
                    // Firefox
                    e.code === 1014 ||
                    // test name field too, because code might not be present
                    // everything except Firefox
                    e.name === 'QuotaExceededError' ||
                    // Firefox
                    e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                    // acknowledge QuotaExceededError only if there's something already stored
                    (storage && storage.length !== 0);
            }
        }

        /**
         * Combines two URLSearchParams into one, with optional overwriting
         * @author Adapted from https://stackoverflow.com/a/67339954/863487 by StackOverflow user 'Thomas'
         * */
        static combineURLSearchParams(a:URLSearchParams, b:URLSearchParams, overwrite = false): URLSearchParams {
            const fn = overwrite ? a.set : a.append;
            for (let [key, value] of new URLSearchParams(b)) {
                fn.call(a, key, value);
            }
            return a;
        }

    }

    export class Color {
        static rgbToHex(r:number, g:number, b:number):string {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
        static hexToRgb(hex:string) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
    }

    export class Helper {
        static addLoadingOverlayToElement(ele: HTMLElement, position:InsertPosition): void {
            let loadingOverlayHTML = 
                `<div class="gifw-loading-overlay" style="min-height: 7rem;">
                    <div class="position-absolute start-50 translate-middle" style="margin-top: 1rem;">
                        <div class="spinner-border mx-auto" style="width: 3rem;height: 3rem;" role="status">
                        </div>
                    </div>
                    <div class="position-absolute start-50 translate-middle" style="margin-top: 4rem;">
                        <p>Searching</p>
                    </div>
                    <button class="btn btn-cancel position-absolute start-50 translate-middle" style="margin-top: 6rem;" type="button">Cancel</button>
                </div>`
            ele.insertAdjacentHTML(position, loadingOverlayHTML);
            ele.querySelector('.btn-cancel').addEventListener('click', () => { ele.dispatchEvent(new Event('gifw-cancel')) });
        }

        static addFullScreenLoader(mapId: string, loadingText? :string, cancellable? :boolean, cancelCallback?: Function) {
            let loadingTakeoverHTML =
                `<div class="w-100 h-100 position-fixed top-0 start-0 gifw-full-screen-loader">
                    <div class="position-absolute top-50 start-50 translate-middle" style="
                        color: white;
                        text-align: center;
                    "><div class="spinner-border" role="status" style="
                        color: white;
                    ">
                      <span class="visually-hidden">Loading...</span>

                    </div><p>${loadingText}</p>`;
            if (cancellable) {
                loadingTakeoverHTML += `<button class="btn btn-lg btn-danger">Cancel</button>`;
            }
            loadingTakeoverHTML += `</div></div>`
            let mapEle = document.getElementById(`${mapId}Container`);
            mapEle.insertAdjacentHTML('afterbegin', loadingTakeoverHTML);

            if (cancellable && cancelCallback) {
                let cancelButton = mapEle.querySelector('.gifw-full-screen-loader button');
                cancelButton.addEventListener('click', e => {
                    cancelCallback();
                    this.removeFullScreenLoader(mapId);
                }, { once: true });
            }
        }

        static removeFullScreenLoader(mapId: string) {
            let mapEle = document.getElementById(`${mapId}Container`);
            if (mapEle.querySelector('.gifw-full-screen-loader')) {
                //just in case there is more than one
                mapEle.querySelectorAll('.gifw-full-screen-loader').forEach(e => { e.remove() });
            }
        }

        /**
         * Removes the trailing slash from a string if it exists
         * @param str The string you want to remove a trailing slash from
         * @returns The string without a trailing slash
         * @author Seth Holladay/StackOverlow https://stackoverflow.com/a/36242700/863487
         */
        static stripTrailingSlash(str:string){
            return str.endsWith('/') ?
                str.slice(0, -1) :
                str;
        };

        /**
         * Base64 encode a unicode string
         * @param str The string to encode
         * @author MDN https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
         */
        static b64EncodeUnicode(str:string) {
            return btoa(encodeURIComponent(str));
        };

        /**
         * Decode a Base64 string to a unicode string
         * @param str The string to decode
         * @author MDN https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
         */
        static UnicodeDecodeB64(str:string) {
            return decodeURIComponent(atob(str));
        };

        static delay(ms: number) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Gets all parents of a child with specified selector
         * Taken from https://stackoverflow.com/a/63797332/863487 CC-BY-SA 4.0 by JaredMcAteer https://stackoverflow.com/users/577926/jaredmcateer
         * @param child
         * @param selector
         */
        static getAllParentElements(child: HTMLElement, selector: string = '*'): HTMLElement[] {
            const parents: HTMLElement[] = [];

            let parent: HTMLElement = child.parentElement?.closest(selector);
            while (parent) {
                parents.push(parent);
                parent = parent.parentElement?.closest(selector);
            }

            return parents;
        }

        static getKeysFromObject(obj: {}) {
            let keys: string[] = [];
            for (const [key] of Object.entries(obj)) {
                keys.push(key);
            }
            return keys;
        }

        static getValueFromObjectByKey(obj: {}, keyName: string) {

            for (const [key, value] of Object.entries(obj)) {
                if (key.toLowerCase() === keyName.toLowerCase()) {
                    return value;
                }
            }
            return null;
        }

        /**
         * @description
         * Takes an Array<V>, and a grouping function,
         * and returns a Map of the array grouped by the grouping function.
         *
         * @param list An array of type V.
         * @param keyGetter A Function that takes the the Array type V as an input, and returns a value of type K.
         *                  K is generally intended to be a property key of V.
         *
         * @returns Map of the array grouped by the grouping function.
         * @author StackOverlow user mortb - https://stackoverflow.com/a/38327540/863487
         */
        static groupBy<K, V>(list: Array<V>, keyGetter: (input: V) => K): Map<K, Array<V>> {
            const map = new Map<K, Array<V>>();
            list.forEach((item) => {
                const key = keyGetter(item);
                const collection = map.get(key);
                if (!collection) {
                    map.set(key, [item]);
                } else {
                    collection.push(item);
                }
            });
            return map;
        }


    }

    export class Error {
        type: AlertType;
        severity: AlertSeverity;
        title: string;
        content: string;


        constructor(errorType: AlertType, severity: AlertSeverity, title: string, content: string) {
            this.type = errorType;
            this.severity = severity;
            this.title = title;
            this.content = content;

        }
        
        public show() {
            let alert: Alert;
            if (this.type === AlertType.Popup) {
                alert = new Alert(this.type, this.severity, this.title, this.content, '#gifw-error-modal');
            } else if (this.type === AlertType.Toast){
                alert = new Alert(this.type, this.severity, this.title, this.content, '#gifw-error-toast');
            }
            alert.show();
        }

        
    }

    export class File {
        /**
        * Gets the extension from a filename
        *
        * @returns The lower case extension
        * @author https://stackoverflow.com/users/1249581/vision
        * @copyright https://stackoverflow.com/a/12900504/863487 CC-BY-SA 4.0
        */
        static getExtension(path:string): string {
            var basename = path.split(/[\\/]/).pop(),  // extract file name from full path ...
                // (supports `\\` and `/` separators)
                pos = basename.lastIndexOf(".");       // get last position of `.`

            if (basename === "" || pos < 1)            // if file name is empty or ...
                return "";                             //  `.` not found (-1) or comes first (0)

            return basename.slice(pos + 1).toLowerCase();            // extract extension ignoring `.`
        }

        static getFileNameWithoutExtension(path: string): string {
            let ext = this.getExtension(path);
            let fileName = path.replace(`.${ext}`, '');
            return fileName;
        }
    }

    export class Style {

        /**
         * Results an OpenLayers tyle based on geometry type and theme
         * 
         * 
         */
        static getDefaultStyleByGeomType(geomType: string, theme: Theme) : olStyle {
            let rgbColor = Util.Color.hexToRgb(theme.primaryColour);
            let strokeColor = 'rgb(0,0,0)';
            let fillColor = 'rgba(255, 255, 255, 0.2)';
            let fillColorSolid = 'rgb(255, 255, 255)';
            if (rgbColor) {
                strokeColor = `rgb(${rgbColor.r},${rgbColor.g},${rgbColor.b})`;
                fillColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`;
                fillColorSolid = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`;
            }
            if (geomType === 'LineString' || geomType === 'MultiLineString') {
                return new olStyle({
                    stroke: new Stroke({
                        color: strokeColor,
                        width: 3,
                    })
                });
            } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                return new olStyle({
                    fill: new Fill({
                        color: fillColor,
                    }),
                    stroke: new Stroke({
                        color: strokeColor,
                        width: 3,
                    })
                });
            } else if (geomType === 'Point' || geomType === 'MultiPoint') {
                return new olStyle({
                    image: new Circle({
                        fill: new Fill({
                            color: fillColorSolid
                        }),
                        radius: 5,
                        stroke: new Stroke({
                            color: '#000',
                            width: 1
                        })
                    })
                });
            }

        }
    }

    export class Alert {
        type: AlertType;
        severity: AlertSeverity;
        title: string;
        content: string;
        errorElement: HTMLElement;
        constructor(errorType: AlertType, severity: AlertSeverity, title: string, content: string, errorElementSelector:string) {
            this.type = errorType;
            this.severity = severity;
            this.title = title;
            this.content = content;
            this.errorElement = document.querySelector(errorElementSelector);

        }

        public show() {
            if (this.type === AlertType.Popup) {
                let popup = Modal.getOrCreateInstance(this.errorElement, {});
                this.errorElement.querySelector('.modal-title').textContent = this.title;
                this.errorElement.querySelector('.modal-body').innerHTML = this.content;
                //colourize
                switch (this.severity) {
                    case AlertSeverity.Warning:
                        this.errorElement.querySelector(".modal-header").classList.remove("bg-danger", "text-white", "bg-success");
                        this.errorElement.querySelector(".modal-header").classList.add("bg-warning");
                        break;
                    case AlertSeverity.Danger:
                        this.errorElement.querySelector(".modal-header").classList.remove("bg-warning", "bg-success");
                        this.errorElement.querySelector(".modal-header").classList.add("bg-danger", "text-white");
                        break;
                    case AlertSeverity.Success:
                        this.errorElement.querySelector(".modal-header").classList.remove("bg-warning", "bg-danger");
                        this.errorElement.querySelector(".modal-header").classList.add("bg-success", "text-white");
                        break;
                    default:
                        this.errorElement.querySelector(".modal-header").classList.remove("bg-danger", "bg-warning", "bg-success", "text-white");
                        break;
                }
                popup.show();
            } else if (this.type === AlertType.Toast) {
                let toast = Toast.getOrCreateInstance(this.errorElement);
                
                this.errorElement.querySelector('.toast-body span').innerHTML = this.content;

                if (this.errorElement.querySelector('.toast-header') !== null) {
                    this.errorElement.querySelector('.toast-header span').textContent = this.title;
                
                    //colourize header
                    switch (this.severity) {
                        case AlertSeverity.Warning:
                            this.errorElement.querySelector(".toast-header").classList.remove("bg-danger", "text-white", "bg-success");
                            this.errorElement.querySelector(".toast-header").classList.add("bg-warning");
                            break;
                        case AlertSeverity.Danger:
                            this.errorElement.querySelector(".toast-header").classList.remove("bg-warning", "bg-success");
                            this.errorElement.querySelector(".toast-header").classList.add("bg-danger", "text-white");
                            break;
                        case AlertSeverity.Success:
                            this.errorElement.querySelector(".toast-header").classList.remove("bg-warning", "bg-danger");
                            this.errorElement.querySelector(".toast-header").classList.add("bg-success", "text-white");
                            break;
                        default:
                            this.errorElement.querySelector(".toast-header").classList.remove("bg-danger", "bg-warning", "bg-success", "text-white");
                            break;
                    }
                }
                toast.show();
            }
        }

        public hide() {
            if (this.type === AlertType.Popup) {
                let popup = new Modal(this.errorElement, {});
                popup.hide();
            } else if (this.type === AlertType.Toast) {
                let toast = Toast.getOrCreateInstance(this.errorElement);
                toast.hide();
            }
        }

        static showPopupError(title: string, content: string) {
            let alert = new Util.Alert(
                Util.AlertType.Popup,
                Util.AlertSeverity.Danger,
                title,
                content,
                "#gifw-error-modal"
            )
            alert.show();
        }
    }

    export class Mapping {
        static generatePermalinkForMap(map: GIFWMap, includeSearchResults: boolean = true): string {
            //get the current view
            const view = map.olMap.getView();
            const center = view.getCenter();
            const lonlat = toLonLat(center,view.getProjection())
            let hash =
                '#map=' +
                view.getZoom().toFixed(2) +
                '/' +
                lonlat[1].toFixed(5) +
                '/' +
                lonlat[0].toFixed(5) +
                '/' +
                view.getRotation();

            //get turned on layers
            if (map.anyOverlaysOn()) {
                let layerGroup = map.getLayerGroupOfType(LayerGroupType.Overlay);

                let layers: olLayer<any, any>[] = layerGroup.olLayerGroup.getLayersArray();

                let switchedOnLayers = layers.filter(l => l.getVisible() === true && l.get('gifw-is-user-layer') !== true);
                if (switchedOnLayers.length !== 0) {
                    hash += '&layers=';
                    let layerIds = switchedOnLayers.sort((a, b) => b.getZIndex() - a.getZIndex()).map(x => {
                        let layerSource = x.getSource();
                        let styleName: string = '';
                        if (layerSource instanceof TileWMS || layerSource instanceof ImageWMS) {
                            styleName = layerSource.getParams()?.STYLES || "";
                        }
                        return `${x.get('layerId')}/${(x.getOpacity()*100).toFixed(0)}/${x.get('saturation')}/${styleName}`
                    })
                    hash += layerIds.join(',');
                }
            }

            //get basemap
            let activeBasemap = map.getActiveBasemap();
            hash += `&basemap=${activeBasemap.get('layerId')}/${(activeBasemap.getOpacity()*100).toFixed(0)}/${activeBasemap.get('saturation')}`;

            if (includeSearchResults) {
                //get the search results pin
                let searchResultsLayer = map.getLayerById("__searchresults__");

                let source: VectorSource = (searchResultsLayer as VectorLayer<any>).getSource();
                let features = source.getFeatures();
                if (features.length === 1) {
                    let searchResultFeature = features[0];
                    let geom = searchResultFeature.getGeometry();
                    if (geom instanceof Point) {
                        let coords = (geom as SimpleGeometry).getCoordinates();
                        let popupOptions = (searchResultFeature.get('gifw-popup-opts') as GIFWPopupOptions);
                        let searchResultData = {
                            content: popupOptions.content,
                            title: searchResultFeature.get('gifw-popup-title')
                        }
                        try {

                            let encodedSRData = Helper.b64EncodeUnicode(JSON.stringify(searchResultData));
                            hash += `&sr=${coords[0]},${coords[1]}&srdata=${encodedSRData}`;
                        } catch (e) {
                            console.warn('Could not generate search result component for permalink');
                            console.warn(e);
                        }
                    }
                }
            }
            let baseUrl = `${window.location.origin}${window.location.pathname}`;
            return `${baseUrl}${hash}`;
        }
    }
    

    export const enum AlertType {
        Popup,
        Toast
    }
    export const enum AlertSeverity{
        Danger,
        Warning,
        Info,
        Success
    }
}