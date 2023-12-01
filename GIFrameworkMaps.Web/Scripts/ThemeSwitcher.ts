/**
 * Some portions of this code have been adapted from Color mode toggler for Bootstrap's docs (https://getbootstrap.com/)
 * Copyright 2011-2023 The Bootstrap Authors
 * Licensed under the Creative Commons Attribution 3.0 Unported License.
 */

import { UserSettings } from "./UserSettings";

export class ThemeSwitcher
{
    _themeSwitcherContainer: HTMLElement;
    _localStorageItemName: string;
    _currentTheme: string = "light";
    constructor(themeSwitcherContainer: HTMLElement, localStorageItemName: string) {
        this._themeSwitcherContainer = themeSwitcherContainer;
        this._localStorageItemName = localStorageItemName;
        this.init();
    }

    init() {
        const storedTheme = UserSettings.getItem(this._localStorageItemName, undefined, ["light", "dark", "auto"]);
        if (storedTheme) {
            this._currentTheme = storedTheme;
        }
        this.setTheme(this._currentTheme);
        this.showActiveThemeInSwitcher();
        this.attachListeners();
    }
    private setTheme(theme: string) {
        this._currentTheme = theme;
        if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-bs-theme', 'dark')
        } else {
            document.documentElement.setAttribute('data-bs-theme', theme)
        }
        UserSettings.setItem(this._localStorageItemName,theme);
    }
    private showActiveThemeInSwitcher() {
        if (!this._themeSwitcherContainer) {
            return;
        }
        const themeSwitcherHeaderIcon = this._themeSwitcherContainer.querySelector('a.dropdown-toggle i.bi');
        themeSwitcherHeaderIcon.className = `bi bi-${this.getIconFromThemeName(this._currentTheme)}`;
        //set correct button to active
        const themeButtons = this._themeSwitcherContainer.querySelectorAll('button[data-bs-theme-value]')
        themeButtons.forEach(themeButton => {
            const themeButtonValue = themeButton.getAttribute('data-bs-theme-value');
            if (themeButtonValue === this._currentTheme) {
                themeButton.classList.add('active');
            } else {
                themeButton.classList.remove('active');
            }
        })

    }
    private attachListeners() {
        if (!this._themeSwitcherContainer) {
            return;
        }
        const themeButtons = this._themeSwitcherContainer.querySelectorAll('button[data-bs-theme-value]')
        themeButtons.forEach(themeButton => {
            themeButton.addEventListener('click',() => {
                const theme = themeButton.getAttribute('data-bs-theme-value')
                this.setTheme(theme);
                this.showActiveThemeInSwitcher();
            })
        })
    }
    private getIconFromThemeName(theme:string) {
        switch (theme) {
            case "light":
                return "sun-fill";
            case "dark":
                return "moon-stars-fill";
            case "auto":
                return "circle-half";
        }
    }
}

