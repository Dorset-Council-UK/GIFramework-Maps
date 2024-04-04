import { RecentOrFeaturedVersion } from "./Interfaces/RecentOrFeaturedVersion";
import { GIFWMap } from "./Map";
import { UserSettings } from "./UserSettings";

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
          versions
            .filter((v) => v.id !== this.gifwMapInstance.config.id)
            .reverse()
            .forEach((version) => {
              const versionHtml = `<li><a class="dropdown-item" href="${version.url}">${version.name}</a></li>`;
              versionTogglerContainer.insertAdjacentHTML(
                "afterbegin",
                versionHtml,
              );
            });
          const headerHtml = `<li><h6 class="dropdown-header">${versions[0].type}</h6></li>`;
          versionTogglerContainer.insertAdjacentHTML("afterbegin", headerHtml);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  private getRecentVersions(excludeCurrentVersion = false) {
    const recentVersionsSetting = UserSettings.getItem("RecentVersions");
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
    UserSettings.setItem("RecentVersions", currentVersionsList.join(","));
  }
}
