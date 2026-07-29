import Sortable from "sortablejs";
import DOMPurify from "dompurify";

export class CategoryLayerSort {
  private readonly _sortList: HTMLUListElement;
  private readonly _sortAlphaCheckbox: HTMLInputElement | null;
  private readonly _customSortContainer: HTMLElement | null;
  private _sortable: Sortable | null = null;

  constructor(sortList: HTMLUListElement) {
    this._sortList = sortList;
    this._sortAlphaCheckbox = document.querySelector<HTMLInputElement>(
      "#sort-alphabetically",
    );
    this._customSortContainer = document.querySelector<HTMLElement>(
      "#layer-sort-custom",
    );
  }

  init(): void {
    this._sortable = new Sortable(this._sortList, {
      handle: ".drag-handle",
      animation: 150,
      disabled: this._isAlphabetical(),
      onEnd: () => {
        this._renumberSortOrders();
      },
    });

    this._attachCheckboxListeners();
    this._attachAlphaCheckboxListener();
  }

  // ---------------------------------------------------------------------------
  // Alphabetical toggle
  // ---------------------------------------------------------------------------

  private _isAlphabetical(): boolean {
    return this._sortAlphaCheckbox?.checked ?? false;
  }

  private _attachAlphaCheckboxListener(): void {
    this._sortAlphaCheckbox?.addEventListener("change", () => {
      if (this._isAlphabetical()) {
        this._enableAlphabeticalMode();
      } else {
        this._enableCustomSortMode();
      }
    });
  }

  private _enableAlphabeticalMode(): void {
    this._customSortContainer?.setAttribute("hidden", "");
    this._sortable?.option("disabled", true);
  }

  private _enableCustomSortMode(): void {
    this._customSortContainer?.removeAttribute("hidden");
    this._sortable?.option("disabled", false);
  }

  // ---------------------------------------------------------------------------
  // Sort order helpers
  // ---------------------------------------------------------------------------

  private _renumberSortOrders(): void {
    const items = this._sortList.querySelectorAll<HTMLLIElement>(
      "li[data-layer-id]",
    );
    items.forEach((li, index) => {
      const input = li.querySelector<HTMLInputElement>(".sort-order-input");
      if (input) {
        const layerId = li.dataset.layerId;
        input.value = `${layerId}:${index + 1}`;
      }
    });
  }

  private _attachCheckboxListeners(): void {
    document
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="SelectedLayers"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const layerId = checkbox.value;
          if (checkbox.checked) {
            this._addLayerToSortList(layerId, checkbox);
          } else {
            this._removeLayerFromSortList(layerId);
          }
        });
      });
  }

  private _addLayerToSortList(layerId: string, checkbox: HTMLInputElement): void {
    // Remove empty-state message if present
    const emptyMessage = this._sortList.querySelector("#layer-sort-empty-message");
    emptyMessage?.remove();

    // Avoid duplicates
    if (this._sortList.querySelector(`li[data-layer-id="${layerId}"]`)) {
      return;
    }

    // Get the layer name from the associated label (text node only, before any child elements)
    const label = document.querySelector<HTMLLabelElement>(
      `label[for="SelectedLayers__${layerId}"]`,
    );
    const layerName = label?.firstChild?.textContent?.trim() ?? `Layer ${layerId}`;

    // Work out the next sort order position
    const existingItems = this._sortList.querySelectorAll("li[data-layer-id]");
    const nextOrder = existingItems.length + 1;

    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center gap-2";
    li.dataset.layerId = layerId;
    li.dataset.layerName = layerName;
    li.innerHTML = `
      <span class="drag-handle bi bi-grip-vertical text-muted" style="cursor: grab;" title="Drag to reorder"></span>
      <span class="flex-grow-1">${DOMPurify.sanitize(layerName)}</span>
      <input type="hidden" name="sortOrderData" value="${layerId}:${nextOrder}" data-layer-id="${layerId}" class="sort-order-input" />
    `;

    this._sortList.appendChild(li);
  }

  private _removeLayerFromSortList(layerId: string): void {
    const li = this._sortList.querySelector<HTMLLIElement>(
      `li[data-layer-id="${layerId}"]`,
    );
    li?.remove();

    // Renumber remaining items
    this._renumberSortOrders();

    // Show empty-state message if list is now empty
    const remainingItems = this._sortList.querySelectorAll("li[data-layer-id]");
    if (remainingItems.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.id = "layer-sort-empty-message";
      emptyLi.className = "list-group-item text-muted fst-italic";
      emptyLi.innerHTML =
        'No layers selected. Add layers in the <strong>Layers</strong> tab.';
      this._sortList.appendChild(emptyLi);
    }
  }
}