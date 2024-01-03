import { Browser as BrowserHelper } from "./Util";
export class UserSettings {
  /**
   * Gets an item from localStorage
   * @param key The key name to look for (without the -{version} suffix)
   * @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
   *                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
   *                  Useful when a setting can be different between versions
   * @param acceptableValues Optional array of acceptable values. If the items value is not in the acceptableValues array,
   *                         it will be removed from localStorage and null will be returned
   *                         Must be an array of case sensitive strings (even if you convert to boolean/ints afterwards)
   * @returns {string} The item as a string, or null if not found or localStorage unavailable
   * */
  static getItem(
    key: string,
    versionId: number = 0,
    acceptableValues: string[] = [],
  ): string {
    if (BrowserHelper.storageAvailable("localStorage")) {
      if (versionId !== 0) {
        key = `${key}-${versionId}`;
      }
      if (acceptableValues.length !== 0) {
        const item = localStorage.getItem(key);
        if (item !== null && acceptableValues.indexOf(item) !== -1) {
          return item;
        } else {
          localStorage.removeItem(key);
          return null;
        }
      }
      return localStorage.getItem(key);
    }
    return null;
  }

  /**
   * Creates or Updates an item in localStorage
   * @param key The key name to look for (without the -{version} suffix)
   * @param item The item to set. Must already be converted to a valid string
   * @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
   *                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
   *                  Useful when a setting can be different between versions
   * @returns {boolean} Boolean indicating if the operation was successful
   * */
  static setItem(key: string, item: string, versionId: number = 0): boolean {
    if (BrowserHelper.storageAvailable("localStorage")) {
      try {
        if (versionId !== 0) {
          key = `${key}-${versionId}`;
        }
        localStorage.setItem(key, item);
        return true;
      } catch (ex) {
        return false;
      }
    }
    return false;
  }

  /**
   * Deletes an item from localStorage
   * @param key The key name to look for (without the -{version} suffix)
   * @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
   *                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
   *                  Useful when a setting can be different between versions
   * */
  static removeItem(key: string, versionId: number = 0): void {
    if (BrowserHelper.storageAvailable("localStorage")) {
      if (versionId !== 0) {
        key = `${key}-${versionId}`;
      }
      localStorage.removeItem(key);
    }
  }
}
