import { Modal } from "bootstrap";
import { Point } from "ol/geom";
import { Bookmark } from "./Interfaces/Bookmark";
import { GIFWMap } from "./Map";
import { Util } from "./Util";
import * as olExtent from 'ol/extent';

export class BookmarkMenu {
    gifwMapInstance: GIFWMap;
    constructor(gifwMapInstance: GIFWMap) {
        this.gifwMapInstance = gifwMapInstance;

    }

    public init() {
        this.getBookmarks();
        this.addListeners();
    }

    private addListeners() {
        //attach event listener to bookmark button
        const bookmarkButton = document.getElementById('gifw-add-bookmark');
        bookmarkButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddBookmarkModal();
        });
        //attach event listener to add bookmark form
        const addBookmarkForm:HTMLFormElement = document.querySelector('#add-bookmark-modal form');
        addBookmarkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            //do the submit
            this.addBookmark(new FormData(addBookmarkForm));

        });

    }

    /**
     * Gets the bookmarks for the user and adds them to the bookmarks list
     */
    private getBookmarks() {
        const bookmarksListContainer = document.querySelector('#gifw-bookmarks-list');

        bookmarksListContainer.querySelectorAll('li.bookmark-list')?.forEach((item) => { item.remove() });

        fetch(`${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/UserBookmarks`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length !== 0) {
                    this.renderBookmarks(data, bookmarksListContainer as HTMLElement);
                } else {
                    bookmarksListContainer.insertAdjacentHTML('afterbegin', `<li><span class="dropdown-item-text mb-3 text-center">No bookmarks saved yet</span></li>`);
                }
            });
    }

    /**
     * Renders the bookmarks in the bookmarks list
     * @param bookmarks The list of bookmarks to add. Requires at least one
     * @param bookmarksListContainer The container to add the list to
     */
    private renderBookmarks(bookmarks: Bookmark[], bookmarksListContainer: HTMLElement) {
        const newBookmarkTable = document.createElement('table');
        newBookmarkTable.className = "table table-sm align-middle";
        const newBookmarkTableBody = document.createElement('tbody');
        bookmarks.forEach((bookmark) => {
            const newBookmark = document.createElement('a');
            newBookmark.href = `#gifw-zoomtobookmark-${bookmark.id}`;
            newBookmark.className = "dropdown-item";
            newBookmark.innerText = bookmark.name;
            newBookmark.dataset.gifwBookmarkXCoordinate = bookmark.x.toString();
            newBookmark.dataset.gifwBookmarkYCoordinate = bookmark.y.toString();
            newBookmark.dataset.gifwBookmarkZoom = bookmark.zoom.toString();
            newBookmark.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoomToBookmark(bookmark);
            });

            const deleteButton = document.createElement('a');
            deleteButton.href = `#gifw-deletebookmark-${bookmark.id}`;
            deleteButton.innerHTML = `<i class="bi bi-trash"></i>`;
            deleteButton.className = "text-danger";
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.removeBookmark(bookmark.id);
            });
            const newBookmarkTableRow = document.createElement('tr');
            newBookmarkTableRow.id = `gifw-bookmark-${bookmark.id}`;
            newBookmarkTableRow.className = "bookmark-item";
            const newBookmarkTableBookmarkContainer = document.createElement('td');
            newBookmarkTableBookmarkContainer.appendChild(newBookmark);
            const newBookmarkTableDeleteContainer = document.createElement('td');
            newBookmarkTableDeleteContainer.appendChild(deleteButton);
            newBookmarkTableRow.appendChild(newBookmarkTableBookmarkContainer);
            newBookmarkTableRow.appendChild(newBookmarkTableDeleteContainer);
            newBookmarkTableBody.appendChild(newBookmarkTableRow);

        });
        const newBookmarkListItem = document.createElement('li');
        newBookmarkListItem.style.maxHeight = "300px";
        newBookmarkListItem.style.overflow = "auto";
        newBookmarkListItem.className = "bookmark-list";
        newBookmarkTable.appendChild(newBookmarkTableBody);
        newBookmarkListItem.appendChild(newBookmarkTable);
        bookmarksListContainer.insertAdjacentElement('afterbegin', newBookmarkListItem);
    }

    /**
     * Opens the Add Bookmark modal
     */
    private openAddBookmarkModal() {
        //fill in the form
        const addBookmarkForm: HTMLFormElement = document.querySelector('#add-bookmark-modal form');

        const nameInput: HTMLInputElement = addBookmarkForm.querySelector('input[name="Name"]');
        const xInput: HTMLInputElement = addBookmarkForm.querySelector('input[name="X"]');
        const yInput: HTMLInputElement = addBookmarkForm.querySelector('input[name="Y"]');
        const zoomInput: HTMLInputElement = addBookmarkForm.querySelector('input[name="Zoom"]');
        const validationText: HTMLDivElement = addBookmarkForm.querySelector('.text-danger');

        const mapCenter = this.gifwMapInstance.olMap.getView().getCenter();
        const mapZoom = this.gifwMapInstance.olMap.getView().getZoom();

        nameInput.value = "";
        xInput.value = mapCenter[0].toString();
        yInput.value = mapCenter[1].toString();
        zoomInput.value = mapZoom.toString();
        validationText.innerHTML = "";

        const modal = Modal.getOrCreateInstance('#add-bookmark-modal');
        modal.show();
    }

    private async addBookmark(formData: FormData) {
        const resp = await fetch(`${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/AddBookmark`, {
            body: formData,
            method: "post",
        });
        if (resp.ok) {
            //bookmark added successfully
            const modal = Modal.getOrCreateInstance('#add-bookmark-modal');
            modal.hide();
            this.getBookmarks();
            Util.Alert.showTimedToast('Success', '<span class="bi bi-check-circle text-success"></span> Bookmark added successfully', Util.AlertSeverity.Success);
        } else {
            //show error
            
            resp.text().then(t => {
                document.querySelector('#add-bookmark-modal form .text-danger').innerHTML = t;
            })
        }
    }

    private zoomToBookmark(bookmark:Bookmark) {
        console.log(bookmark);
        let coord = [bookmark.x, bookmark.y];
        let point = new Point(coord);
        let curZoom = this.gifwMapInstance.olMap.getView().getZoom();
        let zoomDiff = Math.max(bookmark.zoom, curZoom) - Math.min(bookmark.zoom, curZoom);

        const zoomToExtent = point.getExtent();
        const animationSpeed = this.calculateAnimationSpeed(zoomDiff);
        const maxZoom = bookmark.zoom;

        let leftPadding = (document.querySelector('#gifw-sidebar-left') as HTMLDivElement).getBoundingClientRect().width;
        const screenWidth = this.gifwMapInstance.olMap.getOverlayContainer().getBoundingClientRect().width;
        const searchPanelPercentWidth = (leftPadding / screenWidth) * 100;
        if (searchPanelPercentWidth > 50) {
            leftPadding = 100;
        }

        if(this.gifwMapInstance.isExtentAvailableInCurrentMap(zoomToExtent)) {
            this.fitMapToExtent(zoomToExtent, leftPadding, maxZoom, animationSpeed);
        } else {
            this.showBookmarkOutsideBoundsError();
        }

    }

    private async removeBookmark(bookmarkId: number): Promise<boolean> {
        if (confirm('Are you sure you want to delete this bookmark?')) {
            const response = await fetch(`${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/DeleteBookmark/${bookmarkId}`, { method: 'DELETE' });

            if (!response.ok) {
                Util.Alert.showPopupError('Something went wrong', 'Something went wrong deleting your bookmark. Please try again later.')
                return false;
            }
            this.getBookmarks();
            return true;
        }
    }

    /**
     * TODO: Function copied from Search.ts.  Should be moved to Util.ts or Map.ts
     * @param extent
     * @param leftPadding
     * @param maxZoom
     * @param animationDuration
     */
    private fitMapToExtent(extent: olExtent.Extent, leftPadding: number = 100, maxZoom: number = 50, animationDuration: number = 1000): void {
        let curExtent = this.gifwMapInstance.olMap.getView().calculateExtent();
        if (!Util.Browser.PrefersReducedMotion() && olExtent.containsExtent(curExtent, extent)) {
            this.gifwMapInstance.olMap.getView().fit(extent, { padding: [100, 100, 100, leftPadding], maxZoom: maxZoom, duration: animationDuration });
        } else {
            this.gifwMapInstance.olMap.getView().fit(extent, { padding: [100, 100, 100, leftPadding], maxZoom: maxZoom });
        }
    }

    /**
    * Calculates an appropriate animation speed based on the distance and zoom difference between current location and target location
    * TODO: Function copied from Search.ts.  Should be moved to Util.ts or Map.ts
    * @param coordDiff - The number of metres difference between the target and current location
    * @param zoomDiff - The zoom level difference between the target and current location
    * @returns a number between 100 and 2000 indicating the recommended animation speed (in milliseconds)
    *
    */
    private calculateAnimationSpeed(zoomDiff: number): number {

        let speed = 200;
        if (zoomDiff > 1 && zoomDiff <= 5) {
            speed = 500;
        } else if (zoomDiff > 5 && zoomDiff <= 10) {
            speed = 1000;
        } else if (zoomDiff > 10 && zoomDiff <= 15) {
            speed = 1500;
        } else if (zoomDiff > 15 && zoomDiff <= 20) {
            speed = 2500;
        } else if (zoomDiff > 20) {
            speed = 3000;
        }
        return speed;
    }

    private showBookmarkOutsideBoundsError(): void {
        let errDialog = new Util.Error
            (
                Util.AlertType.Popup,
                Util.AlertSeverity.Danger,
                "Bookmark is outside bounds of map",
                "<p>The bookmark you selected is outside the current max bounds of your background map.</p><p>Choose a different background map to view this bookmark.</p>"
            )
        errDialog.show();
    }
}