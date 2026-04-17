/**
 * Patches OpenLayers GML2 and GML3 format parsers to add support for
 * MultiGeometry (GeometryCollection) elements.
 *
 * By default, OpenLayers' GML2 and GML3 GEOMETRY_PARSERS do not include a
 * handler for `GeometryCollection` (GML 2.x) or `MultiGeometry` (GML 3.x)
 * elements, causing features with GeometryCollection geometries to lose
 * their geometry when parsed from WMS GetFeatureInfo or WFS responses.
 *
 * Import this module to register the MultiGeometry parser at application
 * startup.
 */
import GML2 from "ol/format/GML2";
import GML3 from "ol/format/GML3";
import GMLBase, { GMLNS } from "ol/format/GMLBase";
import GeometryCollection from "ol/geom/GeometryCollection";
import type { Geometry } from "ol/geom";
import {
  makeArrayPusher,
  makeReplacer,
  pushParseAndPop,
  parseNode,
  type Parser,
} from "ol/xml";

/**
 * Reads a MultiGeometry element and returns a GeometryCollection.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- OpenLayers Parser API requires any[]
function readMultiGeometry(
  this: GMLBase,
  node: Element,
  objectStack: any[],
): GeometryCollection | undefined {
  const geometries = pushParseAndPop(
    [] as Geometry[],
    MULTIGEOMETRY_PARSERS,
    node,
    objectStack,
    this,
  );
  if (geometries && geometries.length > 0) {
    return new GeometryCollection(geometries);
  }
  return undefined;
}

/**
 * Parses the child geometry elements within a geometryMember element.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- OpenLayers Parser API requires any[]
function geometryMemberParser(
  this: GMLBase,
  node: Element,
  objectStack: any[],
): void {
  parseNode(GEOMETRYMEMBER_PARSERS, node, objectStack, this);
}

/**
 * Parsers for the children of a MultiGeometry element.
 * Handles both `geometryMember` (single geometry wrapper) and
 * `geometryMembers` (multiple geometries wrapper) as per the GML spec.
 * This follows the same pattern used by OpenLayers' built-in multi-geometry
 * parsers (e.g., MULTIPOINT_PARSERS handles pointMember/pointMembers).
 */
const MULTIGEOMETRY_PARSERS: Record<string, Record<string, Parser>> = {
  [GMLNS]: {
    geometryMember: makeArrayPusher(geometryMemberParser),
    geometryMembers: makeArrayPusher(geometryMemberParser),
  },
};

/**
 * Parsers for geometry elements found within a geometryMember element.
 * Supports all standard GML geometry types including nested MultiGeometry.
 */
const GEOMETRYMEMBER_PARSERS: Record<string, Record<string, Parser>> = {
  [GMLNS]: {
    Point: makeArrayPusher(GMLBase.prototype.readPoint),
    MultiPoint: makeArrayPusher(GMLBase.prototype.readMultiPoint),
    LineString: makeArrayPusher(GMLBase.prototype.readLineString),
    MultiLineString: makeArrayPusher(GMLBase.prototype.readMultiLineString),
    Polygon: makeArrayPusher(GMLBase.prototype.readPolygon),
    MultiPolygon: makeArrayPusher(GMLBase.prototype.readMultiPolygon),
    GeometryCollection: makeArrayPusher(readMultiGeometry),
    MultiGeometry: makeArrayPusher(readMultiGeometry),
  },
};

// Register parsers for both GeometryCollection (GML 2.x element name) and
// MultiGeometry (GML 3.x element name) on all GML format prototypes.
const gml2Parsers = GML2.prototype.GEOMETRY_PARSERS[GMLNS] as Record<
  string,
  ReturnType<typeof makeReplacer>
>;
const readMultiGeometryReplacer = makeReplacer(
  readMultiGeometry as unknown as Parameters<typeof makeReplacer>[0],
);
gml2Parsers["GeometryCollection"] = readMultiGeometryReplacer;
gml2Parsers["MultiGeometry"] = readMultiGeometryReplacer;

const gml3Parsers = GML3.prototype.GEOMETRY_PARSERS[GMLNS] as Record<
  string,
  ReturnType<typeof makeReplacer>
>;
gml3Parsers["GeometryCollection"] = readMultiGeometryReplacer;
gml3Parsers["MultiGeometry"] = readMultiGeometryReplacer;
