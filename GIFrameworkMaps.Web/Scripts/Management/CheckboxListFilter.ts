import Fuse from "fuse.js";

interface CheckboxItem {
  label: string;
  formCheck: HTMLElement;
}

export class CheckboxListFilter {
  private readonly _container: HTMLElement;
  private readonly _searchInput: HTMLInputElement;
  private readonly _toggleButton: HTMLButtonElement;
  private readonly _allFormChecks: HTMLElement[];
  private _fuseInstance: Fuse<CheckboxItem>;
  private _showCheckedOnly = false;

  constructor(container: HTMLElement) {
    this._container = container;
    this._searchInput = container.querySelector(
      "[data-checkbox-filter-search]",
    ) as HTMLInputElement;
    this._toggleButton = container.querySelector(
      "[data-checkbox-filter-toggle]",
    ) as HTMLButtonElement;

    // Collect every .form-check div that contains a checkbox within this container.
    // We intentionally keep a flat reference list even for the nested VersionCategoryList
    // structure so we can show/hide individual items without ever touching the DOM.
    this._allFormChecks = Array.from(
      container.querySelectorAll<HTMLElement>("div.form-check"),
    );

    this._fuseInstance = this._buildFuseInstance();
    this._attachListeners();
    this._attachFormSubmitGuard();
  }

  // ---------------------------------------------------------------------------
  // Initialisation helpers
  // ---------------------------------------------------------------------------

  private _buildFuseInstance(): Fuse<CheckboxItem> {
    const items: CheckboxItem[] = this._allFormChecks.map((fc) => ({
      label: (fc.querySelector("label")?.textContent ?? "").trim(),
      formCheck: fc,
    }));

    return new Fuse(items, {
      includeScore: true,
      threshold: 0.3,
      keys: ["label"],
      ignoreLocation: true,
    });
  }

  private _attachListeners(): void {
    if (this._searchInput) {
      this._searchInput.addEventListener("input", () => this._onSearchInput());
    }
    if (this._toggleButton) {
      this._toggleButton.addEventListener("click", () =>
        this._onToggleChecked(),
      );
    }
  }

  /**
   * Attaches a submit listener to the nearest ancestor <form> that resets the
   * display of every .form-check element before the browser serialises the form
   * data.  This ensures that checked-but-filtered-out checkboxes always submit
   * their values — the belt-and-braces guarantee described in the plan.
   *
   * NOTE: We intentionally do NOT set `disabled` anywhere in this class; CSS
   * visibility (display:none) has no effect on form submission.  This guard is
   * a safety net for any future code that might inadvertently alter that.
   */
  private _attachFormSubmitGuard(): void {
    const form = this._container.closest("form");
    if (!form) return;

    form.addEventListener(
      "submit",
      () => {
        // Reset display on every .form-check wrapper so every checked checkbox
        // is reachable by the browser's form serialiser, regardless of filter state.
        this._allFormChecks.forEach((fc) => {
          fc.style.display = "";
        });
        // Also show any .ms-4 wrappers (nested category containers) that may be hidden.
        this._container
          .querySelectorAll<HTMLElement>(".ms-4")
          .forEach((wrapper) => {
            wrapper.style.display = "";
          });
      },
      // Use capture so this fires before any other submit handler.
      { capture: true },
    );
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  private _onSearchInput(): void {
    const query = this._searchInput.value.trim();

    // If "show checked only" is active, clear it first so the two modes don't conflict.
    if (this._showCheckedOnly) {
      this._showCheckedOnly = false;
      this._setToggleActiveState(false);
    }

    if (query === "") {
      this._showAll();
      return;
    }

    const results = this._fuseInstance.search(query);
    const matchedFormChecks = new Set<HTMLElement>(
      results.map((r) => r.item.formCheck),
    );

    this._allFormChecks.forEach((fc) => {
      const visible = matchedFormChecks.has(fc);
      fc.style.display = visible ? "" : "none";
    });

    // For the recursive VersionCategoryList: if a child matches, its parent
    // .form-check and the .ms-4 wrapper that contains it must also stay visible.
    this._ensureParentsVisible(matchedFormChecks);

    // If a parent matches the filter, keep its children visible too.
    this._expandMatchedParents(matchedFormChecks);

    // Hide any .ms-4 wrappers whose every child .form-check is hidden.
    this._syncNestedWrappers();
  }

  private _onToggleChecked(): void {
    // Clear text search when activating "show checked only".
    if (!this._showCheckedOnly && this._searchInput) {
      this._searchInput.value = "";
    }

    this._showCheckedOnly = !this._showCheckedOnly;
    this._setToggleActiveState(this._showCheckedOnly);

    if (!this._showCheckedOnly) {
      this._showAll();
      return;
    }

    // Disable the search input to prevent conflicting filter states.
    if (this._searchInput) {
      this._searchInput.disabled = true;
    }

    this._allFormChecks.forEach((fc) => {
      const checkbox = fc.querySelector<HTMLInputElement>(
        "input[type=checkbox]",
      );
      fc.style.display = checkbox?.checked ? "" : "none";
    });

    const checkedFormChecks = new Set<HTMLElement>(
      this._allFormChecks.filter((fc) => {
        const cb = fc.querySelector<HTMLInputElement>("input[type=checkbox]");
        return cb?.checked === true;
      }),
    );

    this._ensureParentsVisible(checkedFormChecks);
    this._syncNestedWrappers();
  }

  // ---------------------------------------------------------------------------
  // Visibility helpers
  // ---------------------------------------------------------------------------

  /**
   * Shows every .form-check and .ms-4 wrapper in the container and re-enables
   * the search input.
   */
  private _showAll(): void {
    this._allFormChecks.forEach((fc) => {
      fc.style.display = "";
    });
    this._container
      .querySelectorAll<HTMLElement>(".ms-4")
      .forEach((wrapper) => {
        wrapper.style.display = "";
      });
    if (this._searchInput) {
      this._searchInput.disabled = false;
    }
  }

  /**
   * For a given set of visible (matched) .form-check elements, walk up the DOM
   * to ensure every ancestor .form-check and .ms-4 wrapper within the container
   * is also made visible.  This handles the nested VersionCategoryList tree.
   */
  private _ensureParentsVisible(visibleFormChecks: Set<HTMLElement>): void {
    visibleFormChecks.forEach((fc) => {
      let node: HTMLElement | null = fc.parentElement;
      while (node && node !== this._container) {
        if (
          node.classList.contains("ms-4") ||
          node.classList.contains("form-check")
        ) {
          node.style.display = "";
          // Also ensure the sibling .form-check directly above the .ms-4 is visible.
          if (node.classList.contains("ms-4")) {
            const preceding = node.previousElementSibling as HTMLElement | null;
            if (preceding?.classList.contains("form-check")) {
              preceding.style.display = "";
            }
          }
        }
        node = node.parentElement;
      }
    });
  }

  /**
   * For every matched .form-check that has a .ms-4 sibling (i.e. it is a
   * parent category), shows all descendant .form-check elements within that
   * sibling.  This means a parent matching the search query keeps its children
   * visible rather than hiding them.
   */
  private _expandMatchedParents(matchedFormChecks: Set<HTMLElement>): void {
    matchedFormChecks.forEach((fc) => {
      const next = fc.nextElementSibling as HTMLElement | null;
      if (next?.classList.contains("ms-4")) {
        next.querySelectorAll<HTMLElement>("div.form-check").forEach((child) => {
          child.style.display = "";
          matchedFormChecks.add(child);
        });
      }
    });
  }

  /**
   * Hides any .ms-4 wrapper whose every descendant .form-check is hidden.
   * This keeps the tree tidy when no children match.
   */
  private _syncNestedWrappers(): void {
    this._container
      .querySelectorAll<HTMLElement>(".ms-4")
      .forEach((wrapper) => {
        const children = Array.from(
          wrapper.querySelectorAll<HTMLElement>("div.form-check"),
        );
        const allHidden =
          children.length > 0 &&
          children.every((c) => c.style.display === "none");
        wrapper.style.display = allHidden ? "none" : "";
      });
  }

  // ---------------------------------------------------------------------------
  // UI state
  // ---------------------------------------------------------------------------

  private _setToggleActiveState(active: boolean): void {
    if (!this._toggleButton) return;
    if (active) {
      this._toggleButton.classList.add("active");
      this._toggleButton.setAttribute("aria-pressed", "true");
    } else {
      this._toggleButton.classList.remove("active");
      this._toggleButton.setAttribute("aria-pressed", "false");
      // Re-enable the search input when toggle is turned off.
      if (this._searchInput) {
        this._searchInput.disabled = false;
      }
    }
  }
}
