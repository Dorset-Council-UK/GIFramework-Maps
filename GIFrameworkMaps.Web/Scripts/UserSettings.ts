import { Util } from "./Util";

export class UserSettings {

    /**
     * Gets an item from localStorage
     * @param key The key name to look for (without the -{version} suffix)
     * @param versionId Optional GIFramework Maps Version ID number used to specifiy which version the key applies to
     *                  Will be appended on to the end of the key param e.g. `keyName-2` for versionId = 2
     *                  Useful when a setting can be different between versions
     * @returns {string} The item as a string, or null if not found or localStorage unavailable
     * */
    static getItem(key: string, versionId: number = 0): string {
        if (Util.Browser.storageAvailable('localStorage')) {
            if (versionId !== 0) {
                key = `${key}-${versionId}`;
            }
            return localStorage.getItem(key)
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
        if (Util.Browser.storageAvailable('localStorage')) {
            try {
                if (versionId !== 0) {
                    key = `${key}-${versionId}`;
                }
                localStorage.setItem(key, item)
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
        if (Util.Browser.storageAvailable('localStorage')) {
            if (versionId !== 0) {
                key = `${key}-${versionId}`;
            }
            localStorage.removeItem(key);
        }
    }
}