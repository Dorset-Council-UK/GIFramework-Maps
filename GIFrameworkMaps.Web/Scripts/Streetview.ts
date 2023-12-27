import { toLonLat } from "ol/proj";
import { GIFWContextMenu } from "./ContextMenu";
import { StreetviewMetadataResponse } from "./Interfaces/StreetviewMetadataResponse";

export class Streetview {
    metadataUrl: string = 'https://maps.googleapis.com/maps/api/streetview/metadata';
    apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.metadataUrl += `?key=${this.apiKey}&source=outdoor`;
    }

    /**
     * Initiliazes the streetview context menu item into the passed in contextMenu
     * @param contextMenu The context menu to add the streetview control to
     */
    public init(contextMenu: GIFWContextMenu) {

        const streetviewControl =
        {
            text: 'Checking for Street View imagery',
            classname: 'context-menu-item google-streetview-link',
            callback: function () {
                const link: HTMLElement = document.querySelector('.context-menu-item.google-streetview-link');
                const streetviewUrl = link.dataset.gifwStreetViewUrl;
                if (streetviewUrl !== '') {
                    window.open(streetviewUrl, "_blank");
                }
            }
        };
        contextMenu.control.push(streetviewControl);
        contextMenu.items.push(streetviewControl);

        contextMenu.control.on('open', async (event) => {
            const link = document.querySelector('.context-menu-item.google-streetview-link');
            link.textContent = 'Checking for Street View Imagery';
            (link as HTMLElement).dataset.gifwStreetViewUrl = '';
            const latlon = toLonLat(event.coordinate);
            const streetviewURL = await this.getGoogleStreetviewAtLocation(latlon[1], latlon[0]);
            if (streetviewURL !== '') {
                link.textContent = 'Open Street View at this location';
                (link as HTMLElement).dataset.gifwStreetViewUrl = streetviewURL;
            } else {
                link.textContent = 'No Street View at this location 🙁';
                (link as HTMLElement).dataset.gifwStreetViewUrl = '';
            }
        })
    }

    /**
     * Returns a URL to a Streetview image at the lat lon provided
     * @param lat The latitude coordinate 
     * @param lon The longitude coordinate
     * @returns A URL to a Google Streetview map, or null
     */
    private async getGoogleStreetviewAtLocation(lat: number, lon: number): Promise<string> {
        const metadata = await this.getGoogleStreetviewMetadataAtLocation(lat, lon);
        if (await metadata.status === 'OK') {
            //build the URL
            return `https://www.google.com/maps/@?api=1&map_action=pano&pano=${metadata.pano_id}`
        }
        return '';
    }

    /**
     * Returns metadata for a Google Streetview image at the provided lat lon
     * The metadata indicates whether there is an image or not, and if there is, the 
     * values required to fetch it
     * @param lat The latitude coordinate 
     * @param lon The longitude coordinate
     */
    private async getGoogleStreetviewMetadataAtLocation(lat:number,lon:number): Promise<StreetviewMetadataResponse> {
        const url = `${this.metadataUrl}&location=${lat},${lon}`;
        const resp = await fetch(url);
        const metadata = await resp.json() as StreetviewMetadataResponse;

        return metadata;
    }
}