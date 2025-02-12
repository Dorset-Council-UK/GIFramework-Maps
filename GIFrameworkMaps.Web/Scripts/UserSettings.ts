import { storageAvailable } from "./Util";
/**
  * Gets an item from localStorage or sessionStorage
  * @param storageType The type of storage to look in (localStorage or sessionStorage)
  * @param key The key name to look for (without the -{version} suffix)
  * @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
  *                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
  *                  Useful when a setting can be different between versions
  * @param acceptableValues Optional array of acceptable values. If the items value is not in the acceptableValues array,
  *                         it will be removed from localStorage and null will be returned
  *                         Must be an array of case sensitive strings (even if you convert to boolean/ints afterwards)
  * @returns {string} The item as a string, or null if not found or localStorage unavailable
  * */
function getStorageItem(
  storageType: Storage,
  key: string,
  versionId: number,
  acceptableValues: string[]
): string {
  if (storageAvailable(storageType === localStorage ? "localStorage" : "sessionStorage")) {
    if (versionId !== 0) {
      key = `${key}-${versionId}`;
    }
    if (acceptableValues.length !== 0) {
      const item = storageType.getItem(key);
      if (item !== null && acceptableValues.indexOf(item) !== -1) {
        return item;
      } else {
        storageType.removeItem(key);
        return null;
      }
    }
    return storageType.getItem(key);
  }
  return null;
}

/**
* Creates or Updates an item in localStorage or sessionStorage
* @param storageType The type of storage to store the data in (localStorage or sessionStorage)
* @param key The key name to look for (without the -{version} suffix)
* @param item The item to set. Must already be converted to a valid string
* @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
*                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
*                  Useful when a setting can be different between versions
* @returns {boolean} Boolean indicating if the operation was successful
* */
function setStorageItem(
  storageType: Storage,
  key: string,
  item: string,
  versionId: number
): boolean {
  if (storageAvailable(storageType === localStorage ? "localStorage" : "sessionStorage")) {
    try {
      if (versionId !== 0) {
        key = `${key}-${versionId}`;
      }
      storageType.setItem(key, item);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
* Deletes an item from localStorage or sessionStorage
* @param storageType The type of storage to look in (localStorage or sessionStorage)
* @param key The key name to look for (without the -{version} suffix)
* @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
*                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
*                  Useful when a setting can be different between versions
* */
function removeStorageItem(
  storageType: Storage,
  key: string,
  versionId: number
): void {
  if (storageAvailable(storageType === localStorage ? "localStorage" : "sessionStorage")) {
    if (versionId !== 0) {
      key = `${key}-${versionId}`;
    }
    storageType.removeItem(key);
  }
}

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
  */
export function getItem(
  key: string,
  versionId: number = 0,
  acceptableValues: string[] = []
): string {
  return getStorageItem(localStorage, key, versionId, acceptableValues);
}

/**
  * Gets an item from sessionStorage
  * @param key The key name to look for (without the -{version} suffix)
  * @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
  *                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
  *                  Useful when a setting can be different between versions
  * @param acceptableValues Optional array of acceptable values. If the items value is not in the acceptableValues array,
  *                         it will be removed from localStorage and null will be returned
  *                         Must be an array of case sensitive strings (even if you convert to boolean/ints afterwards)
  * @returns {string} The item as a string, or null if not found or localStorage unavailable
*/
export function getSessionItem(
  key: string,
  versionId: number = 0,
  acceptableValues: string[] = []
): string {
  return getStorageItem(sessionStorage, key, versionId, acceptableValues);
}

/**
* Creates or Updates an item in localStorage
* @param key The key name to look for (without the -{version} suffix)
* @param item The item to set. Must already be converted to a valid string
* @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
*                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
*                  Useful when a setting can be different between versions
* @returns {boolean} Boolean indicating if the operation was successful
*/
export function setItem(
  key: string,
  item: string,
  versionId: number = 0
): boolean {
  return setStorageItem(localStorage, key, item, versionId);
}
/**
* Creates or Updates an item in sessionStorage
* @param key The key name to look for (without the -{version} suffix)
* @param item The item to set. Must already be converted to a valid string
* @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
*                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
*                  Useful when a setting can be different between versions
* @returns {boolean} Boolean indicating if the operation was successful
*/
export function setSessionItem(
  key: string,
  item: string,
  versionId: number = 0
): boolean {
  return setStorageItem(sessionStorage, key, item, versionId);
}
/**
* Deletes an item from localStorage
* @param key The key name to look for (without the -{version} suffix)
* @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
*                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
*                  Useful when a setting can be different between versions
* */
export function removeItem(
  key: string,
  versionId: number = 0
): void {
  removeStorageItem(localStorage, key, versionId);
}
/**
* Deletes an item from sessionStorage
* @param key The key name to look for (without the -{version} suffix)
* @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
*                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
*                  Useful when a setting can be different between versions
* */
export function removeSessionItem(
  key: string,
  versionId: number = 0
): void {
  removeStorageItem(sessionStorage, key, versionId);
}

