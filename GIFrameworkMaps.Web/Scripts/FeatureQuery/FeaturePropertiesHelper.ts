import { getKeysFromObject } from "../Util";

const _prioritisedTitleFields = [
  "name",
  "title",
  "address",
  "id",
  "postcode",
  "featureid",
];
const _disallowedKeys = [
  "geom",
  "boundedby",
  "the_geom",
  "geoloc",
  "mi_style",
  "mi_prinx",
];

export function getMostAppropriateTitleFromProperties(props: object) {
  const properties = getKeysFromObject(props);

  const titleProperty = _prioritisedTitleFields.find((t) =>
    properties.map((p) => p.toLowerCase()).includes(t.toLowerCase()),
  );
  return titleProperty;
}
export function getFirstAllowedPropertyFromProperties(
  props: object[],
): [string, object] {
  const propArr = Object.entries(props);

  const firstProp = propArr.find((p) =>
    isUserDisplayablePropertyAndValue(p[0], p[1]),
  );

  return firstProp;
}
export function isUserDisplayableProperty(keyName: string) {
  if (!_disallowedKeys.includes(keyName.toLowerCase())) {
    return true;
  }
  return false;
}
export function isUserDisplayablePropertyAndValue(
  keyName: string,
  value: unknown,
) {
  if (
    !_disallowedKeys.includes(keyName.toLowerCase()) &&
    typeof value !== "object"
  ) {
    return true;
  }
  return false;
}

