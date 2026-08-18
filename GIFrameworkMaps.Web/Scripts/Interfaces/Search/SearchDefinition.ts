export interface SearchDefinition {
  id: number;
  name?: string;
  title?: string;
  attributionHtml?: string;
  maxResults?: number | null;
  zoomLevel?: number | null;
  epsg?: number;
  validationRegex?: string;
  minSearchTextLength?: number | null;
  maxSearchTextLength?: number | null;
  supressGeom?: boolean;
}
