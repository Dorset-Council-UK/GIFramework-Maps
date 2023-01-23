export interface SearchDefinition {
    id: number;
    name?: string;
    title?: string;
    attributionHtml?: string;
    maxResults?: number | null;
    zoomLevel?: number | null;
    epsg?: number;
    validationRegex?: string;
    supressGeom?: boolean;
}