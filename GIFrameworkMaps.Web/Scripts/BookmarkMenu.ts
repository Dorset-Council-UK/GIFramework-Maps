import { Collapse, Dropdown, Modal } from "bootstrap";
import { Point } from "ol/geom";
import { Bookmark } from "./Interfaces/Bookmark";
import { GIFWMap } from "./Map";
import { Alert, AlertSeverity, AlertType, CustomError, Mapping as MappingUtil } from "./Util";

export class BookmarkMenu {
    gifwMapInstance: GIFWMap;
    constructor(gifwMapInstance: GIFWMap) {
        this.gifwMapInstance = gifwMapInstance;
    }

    /**
     * Initialize the bookmarks functionality
     */
    public init() {
        this.getBookmarks();
        this.addListeners();
    }

    /**
     * Adds various event listeners for the bookmarks functionality
     */
    private addListeners() {
        //attach event listener to add bookmark button
        const bookmarkButton = document.getElementById('gifw-add-bookmark');
        bookmarkButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddBookmarkModal();
        });
        //attach event listener to add bookmark form
        const addBookmarkForm:HTMLFormElement = document.querySelector('#add-bookmark-modal form');
        addBookmarkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBookmark(new FormData(addBookmarkForm));

        });
        //attach event listeners to change the icon of the bookmark menu on show/hide
        const dropdownMenuEle = document.querySelector('#gifw-bookmarks-list').parentElement;
        dropdownMenuEle.addEventListener('show.bs.dropdown', () => {
            dropdownMenuEle.querySelector('a i').className = "bi bi-bookmark-fill";
        })
        dropdownMenuEle.addEventListener('hide.bs.dropdown', () => {
            dropdownMenuEle.querySelector('a i').className = "bi bi-bookmark";
        })
    }

    /**
     * Gets the bookmarks for the user and adds them to the bookmarks list
     */
    private async getBookmarks() {
        const bookmarksListContainer = document.querySelector('#gifw-bookmarks-list');
        bookmarksListContainer.querySelectorAll('li.bookmark-list')?.forEach((item) => { item.remove() });
        try {
            const resp = await fetch(`${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/Bookmarks`);

            if (!resp.ok) {
                throw new Error("Network response was not OK");
            } else {
                const bookmarks = await resp.json();
                if (bookmarks && bookmarks.length !== 0) {
                    this.renderBookmarks(bookmarks, bookmarksListContainer as HTMLElement);
                } else {
                    bookmarksListContainer.insertAdjacentHTML('afterbegin', `<li class="bookmark-list"><span class="dropdown-item-text mb-3 text-center">No bookmarks saved yet</span></li>`);
                }
            }
        } catch (e) {
            console.error(e);
            bookmarksListContainer.insertAdjacentHTML('afterbegin', `<li class="bookmark-list"><span class="dropdown-item-text mb-3 text-center">There was a problem fetching your bookmarks</span></li>`);
        }
    }

    /**
     * Renders the bookmarks in the bookmarks list
     * @param bookmarks The list of bookmarks to add. Requires at least one
     * @param bookmarksListContainer The container to add the list to
     */
    private renderBookmarks(bookmarks: Bookmark[], bookmarksListContainer: HTMLElement) {
        const bookmarksListFragment = document.getElementById('bookmarks-list-container-template') as HTMLTemplateElement;
        const bookmarksListInstance = document.importNode(bookmarksListFragment.content, true);

        const newBookmarkTable = bookmarksListInstance.querySelector('table');
        const newBookmarkTableBody = bookmarksListInstance.querySelector('tbody');
        bookmarks.forEach((bookmark) => {
            const bookmarkfragment = document.getElementById('bookmark-template') as HTMLTemplateElement;
            const bookmarkInstance = document.importNode(bookmarkfragment.content, true);
            const bookmarkText = bookmarkInstance.querySelector('a.dropdown-item') as HTMLAnchorElement;
            bookmarkText.href = `#gifw-zoomtobookmark-${bookmark.id}`;
            bookmarkText.innerText = bookmark.name;
            bookmarkText.addEventListener('click', (e) => {
                e.preventDefault();
                this.zoomToBookmark(bookmark);
            });

            const bookmarkDeleteButton = bookmarkInstance.querySelector('a.text-danger') as HTMLAnchorElement;
            bookmarkDeleteButton.href = `#gifw-zoomtobookmark-${bookmark.id}`;
            bookmarkDeleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.removeBookmark(bookmark.id);
            });
            newBookmarkTableBody.appendChild(bookmarkInstance);

        });
        const newBookmarkListItem = bookmarksListInstance.querySelector('li');
        newBookmarkListItem.appendChild(newBookmarkTable);
        bookmarksListContainer.insertAdjacentElement('afterbegin', newBookmarkListItem);
    }

    /**
     * Opens the Add Bookmark modal and fills in the form with the current map center and zoom
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
        this.hideBookmarkMenu();
        const modal = Modal.getOrCreateInstance('#add-bookmark-modal');
        modal.show();
    }

    /**
     * Submits the add bookmark form to the create bookmark endpoint and handles the response
     * @param formData The form data to submit
     */
    private async addBookmark(formData: FormData) {
        const modalEle: HTMLElement = document.querySelector('#add-bookmark-modal');
        const submitButton = modalEle.querySelector('button[type="submit"]');
        submitButton.setAttribute('disabled', 'disabled');
        const resp = await fetch(`${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/Bookmarks/Create`, {
            body: formData,
            method: "post",
        });
        submitButton.removeAttribute('disabled');
        if (resp.status == 201) {
            //bookmark added successfully
            const modal = Modal.getOrCreateInstance(modalEle);
            modal.hide();
            this.getBookmarks();
            Alert.showTimedToast('Success', '<span class="bi bi-check-circle text-success"></span> Bookmark added successfully', AlertSeverity.Success);
        } else {
            //show error text that should be in the response body
            resp.text().then(t => {
                modalEle.querySelector('form .text-danger').innerHTML = t;
            })
        }
    }

    /**
     * Zooms the map to the specified bookmark, handling animation speed and outside bounds issues
     * @param bookmark The bookmark to zoom to
     */
    private zoomToBookmark(bookmark:Bookmark) {
        const coord = [bookmark.x, bookmark.y];
        const point = new Point(coord);
        const curZoom = this.gifwMapInstance.olMap.getView().getZoom();
        const zoomDiff = Math.max(bookmark.zoom, curZoom) - Math.min(bookmark.zoom, curZoom);

        const zoomToExtent = point.getExtent();
        const animationSpeed = MappingUtil.calculateAnimationSpeed(zoomDiff);
        const maxZoom = bookmark.zoom;

        if (this.gifwMapInstance.isExtentAvailableInCurrentMap(zoomToExtent)) {
            this.hideBookmarkMenu();
            this.gifwMapInstance.fitMapToExtent(zoomToExtent, maxZoom, animationSpeed);
        } else {
            this.showBookmarkOutsideBoundsError();
        }
    }

    /**
     * Removes a bookmark with the specified ID from the database
     * @param bookmarkId The ID of the bookmark to remove
     * @returns
     */
    private async removeBookmark(bookmarkId: number): Promise<boolean> {
        if (confirm('Are you sure you want to delete this bookmark?')) {
            const response = await fetch(`${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/Bookmarks/Delete/${bookmarkId}`, { method: 'DELETE' });
            if (!response.ok) {
                Alert.showPopupError('Something went wrong', 'Something went wrong deleting your bookmark. Please try again later.')
                return false;
            }
            this.getBookmarks();
            return true;
        }
    }

    /**
     * Hides the bookmarks dropdown or the entire mobile nav bar as required
     */
    private hideBookmarkMenu(): void {
        const dropdownMenu = Dropdown.getOrCreateInstance('#gifw-bookmarks-list');
        if (dropdownMenu) {
            dropdownMenu.hide();
        }
        const navbar = Collapse.getInstance('.giframeworkMap > header > nav .navbar-collapse');
        if (navbar) {
            navbar.hide();
        }
    }

    /**
     * Shows an error indicating the bookmark the user clicked is outside the bounds of the current map view
     */
    private showBookmarkOutsideBoundsError(): void {
        const errDialog = new CustomError
            (
                AlertType.Popup,
                AlertSeverity.Danger,
                "Bookmark is outside bounds of map",
                "<p>The bookmark you selected is outside the current max bounds of your background map.</p><p>Choose a different background map to view this bookmark.</p>"
            )
        errDialog.show();
    }
}