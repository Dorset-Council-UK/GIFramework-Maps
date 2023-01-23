export interface StreetviewMetadataResponse {
    copyright: string;
    date: string;
    location: StreetviewMetadataLocation;
    pano_id: string;
    status: string;
}

interface StreetviewMetadataLocation {
    lat: number;
    lon: number;
}