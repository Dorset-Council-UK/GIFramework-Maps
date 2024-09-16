export interface TileMatrixSet {
  title: string
  id: string
  uri: string
  orderedAxes: string[]
  crs: string
  tileMatrices: TileMatrice[]
}

interface TileMatrice {
  id: string
  scaleDenominator: number
  cellSize: number
  cornerOfOrigin: string
  pointOfOrigin: number[]
  tileWidth: number
  tileHeight: number
  matrixHeight: number
  matrixWidth: number
}
