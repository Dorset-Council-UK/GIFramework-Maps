import { RecentOrFeaturedVersion, VersionListType } from "./Interfaces/RecentOrFeaturedVersion";
import { GIFWMap } from "./Map";
import { getItem as getSetting, setItem as setSetting } from "./UserSettings";

export class VersionToggler {
  gifwMapInstance: GIFWMap;
  constructor(gifwMapInstance: GIFWMap) {
    this.gifwMapInstance = gifwMapInstance;
  }

  /**
   * Initialize the versions list
   */
  public init() {
    this.updateRecentVersions(this.gifwMapInstance.config.id);
    this.getVersionsList();
  }

  /**
   * Gets the recent or featured versions for the user and adds them to the version toggler
   */
  private async getVersionsList() {
    const versionTogglerContainer = document.querySelector(
      "#gifw-version-toggler",
    );
    if (!versionTogglerContainer) {
      return;
    }
    try {
      const resp = await fetch(
        `${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/versions/recent?versionIds=${this.getRecentVersions(true).join(",")}`,
      );

      if (!resp.ok) {
        throw new Error("Network response was not OK");
      } else {
        if (resp.status == 204) {
          return;
        }
        const versions: RecentOrFeaturedVersion[] = await resp.json();
        if (versions && versions.length !== 0) {
          const recentVersions = versions.filter((v) => v.type === VersionListType.Recent && v.id !== this.gifwMapInstance.config.id);
          const featuredVersions = versions.filter((v) => v.type === VersionListType.Featured && v.id !== this.gifwMapInstance.config.id);

          if (featuredVersions.length !== 0) {
            featuredVersions.reverse()
              .forEach((version) => {
                const versionHtml = `<li><a class="dropdown-item" href="${version.url}">${version.name}</a></li>`;
                versionTogglerContainer.insertAdjacentHTML(
                  "afterbegin",
                  versionHtml,
                );
              });
            const headerHtml = `<li><h6 class="dropdown-header">Featured</h6></li>`;
            versionTogglerContainer.insertAdjacentHTML("afterbegin", headerHtml);
          }
          if (recentVersions.length !== 0) {
            recentVersions.reverse()
              .forEach((version) => {
                const versionHtml = `<li><a class="dropdown-item" href="${version.url}">${version.name}</a></li>`;
                versionTogglerContainer.insertAdjacentHTML(
                  "afterbegin",
                  versionHtml,
                );
              });
            const headerHtml = `<li><h6 class="dropdown-header">Recent</h6></li>`;
            versionTogglerContainer.insertAdjacentHTML("afterbegin", headerHtml); 
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  private getRecentVersions(excludeCurrentVersion = false) {
    const recentVersionsSetting = getSetting("RecentVersions");
    if (recentVersionsSetting === null) {
      return [];
    }
    //split the settings into an array of (hopefully) numbers
    let recentVersions = recentVersionsSetting.split(",").map((s) => {
      return parseInt(s);
    });
    //remove current version
    if (excludeCurrentVersion) {
      recentVersions = recentVersions.filter(
        (v) => v !== this.gifwMapInstance.config.id,
      );
    }
    return recentVersions.filter((v) => !isNaN(v));
  }

  private updateRecentVersions(versionId: number) {
    let currentVersionsList = this.getRecentVersions();

    //get rid of any existing instances of this version ID
    currentVersionsList = currentVersionsList.filter(
      (v) => v !== versionId && !isNaN(v),
    );
    //push the version ID to the front
    currentVersionsList.unshift(versionId);
    //tidy up by removing anything over 5 values
    while (currentVersionsList.length > 5) {
      currentVersionsList.pop();
    }
    setSetting("RecentVersions", currentVersionsList.join(","));
  }
}
