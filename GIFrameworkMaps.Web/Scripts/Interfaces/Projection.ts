export interface Projection {
  epsgCode: number;
  name: string;
  description: string | null;
  proj4Definition: string | null;
  minBoundX: number;
  minBoundY: number;
  maxBoundX: number;
  maxBoundY: number;
  defaultRenderedDecimalPlaces: number;
  isDefaultMapProjection: boolean;
  isDefaultViewProjection: boolean;
}