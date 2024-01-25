export interface Projection {
  epsgCode: number;
  description: string | null;
  proj4Definition: string | null;
  minBoundX: number;
  minBoundY: number;
  maxBoundX: number;
  maxBoundY: number;
}