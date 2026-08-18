import { AlertSeverity, AlertType, CustomError } from "./Util";

export class FavouriteLayersManager {
  private favouriteLayerIds: Set<number> = new Set();
  private appRoot: string;

  constructor(appRoot: string) {
    this.appRoot = appRoot;
  }

  /**
   * Fetches the user's favourite layer IDs from the API and populates the local cache
   */
  public async init(): Promise<void> {
    try {
      const resp = await fetch(
        `${document.location.protocol}//${this.appRoot}API/FavouriteLayers`,
      );
      if (!resp.ok) {
        throw new Error("Network response was not OK");
      }
      const layerIds: number[] = await resp.json();
      this.favouriteLayerIds = new Set(layerIds);
    } catch (e) {
      console.error("Failed to fetch favourite layers", e);
    }
  }

  /**
   * Returns true if the given layer ID is in the user's favourites
   * @param layerId The layer ID as a string (matches the Layer interface)
   */
  public isFavourite(layerId: string): boolean {
    return this.favouriteLayerIds.has(parseInt(layerId, 10));
  }

  /**
   * Toggles the favourite state for a layer. Updates the local cache immediately
   * and persists the change via the API.
   * @param layerId The layer ID as a string
   * @returns true if the layer is now a favourite, false if it was removed
   */
  public async toggleFavourite(layerId: string): Promise<boolean> {
    const id = parseInt(layerId, 10);
    const isCurrentlyFavourite = this.favouriteLayerIds.has(id);

    if (isCurrentlyFavourite) {
      return await this.removeFavourite(id);
    } else {
      return await this.addFavourite(id);
    }
  }

  private async addFavourite(layerId: number): Promise<boolean> {
    const token = this.getAntiforgeryToken();
    try {
      const formData = new URLSearchParams({
        layerId: layerId.toString(),
        __RequestVerificationToken: token,
      });
      const resp = await fetch(
        `${document.location.protocol}//${this.appRoot}API/FavouriteLayers/Create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        },
      );
      if (resp.status === 201) {
        this.favouriteLayerIds.add(layerId);
        return true;
      } else {
        const msg = await resp.text();
        console.error("Failed to add favourite layer", msg);
        this.showError();
        return false;
      }
    } catch (e) {
      console.error("Failed to add favourite layer", e);
      this.showError();
      return false;
    }
  }

  private async removeFavourite(layerId: number): Promise<boolean> {
    try {
      const resp = await fetch(
        `${document.location.protocol}//${this.appRoot}API/FavouriteLayers/Delete/${layerId}`,
        { method: "DELETE" },
      );
      if (resp.status === 204) {
        this.favouriteLayerIds.delete(layerId);
        return false;
      } else {
        console.error("Failed to remove favourite layer", resp.status);
        this.showError();
        return true;
      }
    } catch (e) {
      console.error("Failed to remove favourite layer", e);
      this.showError();
      return true;
    }
  }

  private getAntiforgeryToken(): string {
    const tokenInput = document.querySelector(
      'input[name="__RequestVerificationToken"]',
    ) as HTMLInputElement;
    return tokenInput?.value ?? "";
  }

  private showError(): void {
    const errDialog = new CustomError(
      AlertType.Popup,
      AlertSeverity.Danger,
      "Something went wrong",
      "<p>There was a problem updating your favourite layers. Please try again later.</p>",
    );
    errDialog.show();
  }
}
