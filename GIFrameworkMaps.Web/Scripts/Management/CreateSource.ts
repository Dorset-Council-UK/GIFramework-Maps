declare let attributionRendererEndpoint: string;
export class CreateSource {
  attributionRendererEndpoint: string;
  attributionSelectElement: HTMLSelectElement;
  attributionRenderTarget: HTMLElement;
  constructor() {
    this.attributionRendererEndpoint = attributionRendererEndpoint;
    this.attributionSelectElement = document.querySelector(
      "select[data-attribution-select]",
    );
    this.attributionRenderTarget = document.getElementById(
      "attribution-render-target",
    );
  }

  public init() {
    //attach attribution renderer to attribution selector
    this.attributionSelectElement.addEventListener("change", () => {
      this.renderAttributionPreview();
    });
    this.renderAttributionPreview();
  }

  private async renderAttributionPreview() {
    const selectedAttribution =
      this.attributionSelectElement.selectedOptions[0];
    if (selectedAttribution.value !== "") {
      const renderedAttribution = await this.getAttributionPreview(
        selectedAttribution.value,
      );
      this.attributionRenderTarget.innerHTML = renderedAttribution;
    }
  }

  private async getAttributionPreview(attributionId: string) {
    try {
      const response = await fetch(
        `${this.attributionRendererEndpoint}/${attributionId}`,
      );
      const renderedAttribution = await response.text();
      return renderedAttribution;
    } catch {
      return "An error occurred fetching the attribution";
    }
  }
}
