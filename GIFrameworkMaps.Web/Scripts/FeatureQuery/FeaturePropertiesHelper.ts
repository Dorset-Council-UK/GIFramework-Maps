import { Helper } from "../Util";

export class FeaturePropertiesHelper {
  static _prioritisedTitleFields = [
    "name",
    "title",
    "address",
    "id",
    "postcode",
    "featureid",
  ];
  static _disallowedKeys = [
    "geom",
    "boundedby",
    "the_geom",
    "geoloc",
    "mi_style",
    "mi_prinx",
  ];

  public static getMostAppropriateTitleFromProperties(props: object) {
    const properties = Helper.getKeysFromObject(props);

    const titleProperty = this._prioritisedTitleFields.find((t) =>
      properties.map((p) => p.toLowerCase()).includes(t.toLowerCase()),
    );
    return titleProperty;
  }
  public static getFirstAllowedPropertyFromProperties(
    props: object[],
  ): [string, object] {
    const propArr = Object.entries(props);

    const firstProp = propArr.find((p) =>
      this.isUserDisplayablePropertyAndValue(p[0], p[1]),
    );

    return firstProp;
  }
  public static isUserDisplayableProperty(keyName: string) {
    if (!this._disallowedKeys.includes(keyName.toLowerCase())) {
      return true;
    }
    return false;
  }
  public static isUserDisplayablePropertyAndValue(
    keyName: string,
    value: unknown,
  ) {
    if (
      !this._disallowedKeys.includes(keyName.toLowerCase()) &&
      typeof value !== "object"
    ) {
      return true;
    }
    return false;
  }
}
