/**
 * ThemeSwitcher is a standlone script to enable dark/light mode switching in the project with zero dependencies
 * Some code from other parts of the app have been copied in to keep it independent. Ideally tree-shaking in webpack would do this anyway,
 * but at time of writing, this did not work as expected
 * Some portions of this code have been adapted from Color mode toggler for Bootstrap's docs (https://getbootstrap.com/)
 * Copyright 2011-2023 The Bootstrap Authors
 * Licensed under the Creative Commons Attribution 3.0 Unported License.
 */

export class ThemeSwitcher {
  _themeSwitcherContainer: HTMLElement;
  _localStorageItemName: string = "Theme";
  _currentTheme: Theme = "light";
  constructor() {
    this.init();
  }

  init() {
    const storedTheme = ThemeSwitcher.getItem(
      this._localStorageItemName,
      undefined,
      ["light", "dark", "auto"],
    );
    if (storedTheme) {
      this._currentTheme = storedTheme as Theme;
    }
    this.setTheme(this._currentTheme);
    addEventListener("DOMContentLoaded", () => {
      this._themeSwitcherContainer = document.getElementById(
        "gifw-theme-switcher",
      );
      this.showActiveThemeInSwitcher();
      this.attachListeners();
    });
  }
  private setTheme(theme: Theme) {
    this._currentTheme = theme;
    if (
      theme === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      document.documentElement.setAttribute("data-bs-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-bs-theme", theme.toString());
    }
    ThemeSwitcher.setItem(this._localStorageItemName, theme.toString());
  }
  private showActiveThemeInSwitcher() {
    if (!this._themeSwitcherContainer) {
      return;
    }
    const themeSwitcherHeaderIcon = this._themeSwitcherContainer.querySelector(
      "a.dropdown-toggle i.bi",
    );
    themeSwitcherHeaderIcon.className = `bi bi-${this.getIconFromThemeName(
      this._currentTheme,
    )}`;
    //set correct button to active
    const themeButtons = this._themeSwitcherContainer.querySelectorAll(
      "button[data-bs-theme-value]",
    );
    themeButtons.forEach((themeButton) => {
      const themeButtonValue = themeButton.getAttribute("data-bs-theme-value");
      if (themeButtonValue === this._currentTheme) {
        themeButton.classList.add("active");
      } else {
        themeButton.classList.remove("active");
      }
    });
  }

  private attachListeners() {
    if (!this._themeSwitcherContainer) {
      return;
    }
    const themeButtons = this._themeSwitcherContainer.querySelectorAll(
      "button[data-bs-theme-value]",
    );
    themeButtons.forEach((themeButton) => {
      themeButton.addEventListener("click", () => {
        const theme = themeButton.getAttribute("data-bs-theme-value");

        this.setTheme(theme as Theme);
        this.showActiveThemeInSwitcher();
      });
    });
  }
  private getIconFromThemeName(theme: Theme) {
    switch (theme) {
      case "light":
        return "sun-fill";
      case "dark":
        return "moon-stars-fill";
      case "auto":
        return "circle-half";
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
   * */
  static getItem(
    key: string,
    versionId: number = 0,
    acceptableValues: string[] = [],
  ): string {
    if (ThemeSwitcher.storageAvailable("localStorage")) {
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
    if (ThemeSwitcher.storageAvailable("localStorage")) {
      try {
        if (versionId !== 0) {
          key = `${key}-${versionId}`;
        }
        localStorage.setItem(key, item);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
  /**
   * Checks to see if the specified storage type is available in the browser
   * @param type localStorage or sessionStorage
   */
  static storageAvailable(type: "localStorage" | "sessionStorage"): boolean {
    let storage: Storage;

    try {
      storage =
        type === "localStorage" ? window.localStorage : window.sessionStorage;
      const x = "__storage_test__";
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return (
        e instanceof DOMException &&
        // everything except Firefox
        (e.name === "QuotaExceededError" ||
          // Firefox
          e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
        // acknowledge QuotaExceededError only if there's something already stored
        storage &&
        storage.length !== 0
      );
    }
  }
}

export function getCurrentTheme(): Theme {
  const docTheme = document.documentElement.getAttribute("data-bs-theme");
  if (docTheme === "dark") {
    return "dark";
  }
  return "light";
}
new ThemeSwitcher();

type Theme = "light" | "dark" | "auto";
