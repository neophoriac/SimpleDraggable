/**
 * SimpleDraggable
 * 
 * Makes an element draggable within the viewport or document, with optional position persistence and cross-tab sync.
 * 
 * @example
 * const draggable = new SimpleDraggable('unique-id', handleElement, targetElement, true, true);
 */
class SimpleDraggable {

    /**
     * @param {string} id - Unique identifier for storing position in localStorage.
     * @param {HTMLElement} dragElement - The element that will be used as the drag handle.
     * @param {HTMLElement} element - The element to move.
     * @param {boolean} [store=false] - Whether to persist position in localStorage.
     * @param {boolean} [enabled=true] - Whether dragging is enabled on creation.
     * @throws {Error} If required arguments are missing or invalid.
     */
    constructor(id, dragElement, element, store = false, enabled = true) {
        if (!dragElement) throw new Error("dragElement is required!");
        if (!element) throw new Error("element is required!");

        if (!(dragElement instanceof HTMLElement)) {
            throw new Error("dragElement is not an HTMLElement Object!");
        }
        if (!(element instanceof HTMLElement)) {
            throw new Error("element is not an HTMLElement Object!");
        }
        if (HTMLElement.ELEMENT_NODE !== dragElement.nodeType) {
            throw new Error("dragElement is not an element node!");
        }
        if (HTMLElement.ELEMENT_NODE !== element.nodeType) {
            throw new Error("element is not an element node!");
        }
        if (typeof id !== "string" || id === "") {
            throw new Error("ID is not a string or contains no text!");
        }

        this.id = id;
        this.dragElement = dragElement;
        this.element = element;
        this.store = store;
        this.enabled = enabled;

        // Bind event handlers
        this._boundMouseDown = this._mousedown.bind(this);
        this._boundDrag = this._drag.bind(this);
        this._boundStopDrag = this._stopDrag.bind(this);
        this._boundStorage = this._onStorage.bind(this);

        if (this.enabled) {
            this._setProperties();
            this._restorePos();
            this.dragElement.addEventListener('mousedown', this._boundMouseDown);
        }
        window.addEventListener('storage', this._boundStorage);
    }

    /**
     * Initializes element properties and thresholds.
     * Throws if the element's position is not fixed or absolute.
     * Removes stored position if store is false.
     * @private
     */
    _setProperties() {
        if (!this.store) {
            localStorage.removeItem(this.id);
        }

        this.styles = getComputedStyle(this.element);
        this.position = this.styles.position;

        if (this.enabled) {
            if (this.position !== "fixed" && this.position !== "absolute") {
                throw new Error(`Element position cannot be ${this.position}. Use fixed or absolute instead!`);
            }
        }

        this.elementRect = this.element.getBoundingClientRect();
        this.dimensions = this.position === "fixed" ? this.getViewport() : this.getDocDimensions();

        this.borderH = parseFloat(this.styles.borderLeft) + parseFloat(this.styles.borderRight);
        this.borderV = parseFloat(this.styles.borderTop) + parseFloat(this.styles.borderBottom);

        this.thresholdX = this.dimensions.x - (this.elementRect.width + this.borderH);
        this.thresholdY = this.dimensions.y - (this.elementRect.height + this.borderV);

        this.element.dataset.translate = `{"x":0,"y":0}`;

        this.pos_1 = 0; this.pos_2 = 0; this.pos_3 = 0; this.pos_4 = 0;
        this.translateX = 0; this.translateY = 0;
        this.offsetLeft = this.elementRect.left;
        this.offsetTop = this.elementRect.top;
    }

    /**
     * Gets the document's width and height.
     * @returns {{y: number, x: number}}
     */
    getDocDimensions() {
        let y = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
        );
        let x = Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.offsetWidth,
            document.body.clientWidth,
            document.documentElement.clientWidth
        );
        y -= scrollY;
        x -= scrollX;
        return { y: y, x: x };
    }

    /**
     * Gets the viewport's width and height.
     * @returns {{y: number, x: number}}
     */
    getViewport() {
        if (window.visualViewport) {
            return { y: visualViewport.height, x: visualViewport.width };
        }
        // fallback for browsers without visualViewport
        return { y: window.innerHeight, x: window.innerWidth };
    }

    /**
     * Mouse down event handler. Starts dragging if enabled.
     * @param {MouseEvent} e
     * @private
     */
    _mousedown(e) {
        if (this.element.dataset.draggable === "false") return;
        if (e.target !== this.dragElement) return;
        if (e.button !== 0) return;
        e.preventDefault();

        this.pos_3 = e.clientX;
        this.pos_4 = e.clientY;

        this.elementRect = this.element.getBoundingClientRect();

        let translate = { x: 0, y: 0 };
        try {
            if (this.element.dataset.translate) {
                translate = JSON.parse(this.element.dataset.translate);
            }
        } catch { /* fallback to 0,0 */ }

        this.translateX = translate.x;
        this.translateY = translate.y;

        this.offsetLeft = this.elementRect.left - this.translateX;
        this.offsetTop = this.elementRect.top - this.translateY;

        this.dimensions = this.position === "fixed" ? this.getViewport() : this.getDocDimensions();
        this.thresholdX = this.dimensions.x - (this.elementRect.width + this.borderH);
        this.thresholdY = this.dimensions.y - (this.elementRect.height + this.borderV);

        window.addEventListener("mousemove", this._boundDrag);
        window.addEventListener("mouseup", this._boundStopDrag, { once: true });
    }

    /**
     * Mouse move event handler. Updates element position.
     * @param {MouseEvent} e
     * @private
     */
    _drag(e) {
        this.pos_1 = this.pos_3 - e.clientX;
        this.pos_2 = this.pos_4 - e.clientY;
        this.pos_3 = e.clientX;
        this.pos_4 = e.clientY;

        this.translateY -= this.pos_2;
        this.translateX -= this.pos_1;

        let threshold = this._getThresholds(this.translateY + this.offsetTop, this.translateX + this.offsetLeft);

        this.translateY += threshold.y;
        this.translateX += threshold.x;

        this.element.style.translate = `${this.translateX}px ${this.translateY}px`;
    }

    /**
     * Mouse up event handler. Stops dragging and stores position if enabled.
     * @param {MouseEvent} e
     * @private
     */
    _stopDrag(e) {
        window.removeEventListener("mousemove", this._boundDrag);

        const data = { x: this.translateX, y: this.translateY };
        this.element.dataset.translate = `{"x":${this.translateX}, "y":${this.translateY}}`;
        if (this.store) {
            localStorage.setItem(this.id, JSON.stringify(data));
        }
    }

    /**
     * Calculates threshold corrections to keep element within bounds.
     * @param {number} top
     * @param {number} left
     * @returns {{x: number, y: number}}
     * @private
     */
    _getThresholds(top, left) {
        let x = 0, y = 0;
        if (this.thresholdX - left < 0) {
            x = this.thresholdX - left;
        } else if (left < 0) {
            x = Math.abs(left);
        }
        if (this.thresholdY - top < 0) {
            y = this.thresholdY - top;
        } else if (top < 0) {
            y = Math.abs(top);
        }
        return { x: x, y: y };
    }

    /**
     * Calculates the corrected position for the element.
     * @param {{x: number, y: number}} data
     * @returns {{x: number, y: number}}
     * @private
     */
    _getPos(data) {
        let pos = !data ? { y: 0, x: 0 } : { y: data.y, x: data.x };
        this.elementRect = this.element.getBoundingClientRect();
        this.offsetLeft = this.elementRect.left - pos.x;
        this.offsetTop = this.elementRect.top - pos.y;
        let threshold = this._getThresholds(pos.y + this.offsetTop, pos.x + this.offsetLeft);
        pos.y += threshold.y;
        pos.x += threshold.x;
        return pos;
    }

    /**
     * Handles storage events for cross-tab sync.
     * @param {StorageEvent} e
     * @private
     */
    _onStorage(e) {
        if (this.element.dataset.draggable === "false") return;
        if (e.key === this.id) {
            this._updatePos(e.newValue);
        }
    }

    /**
     * Restores the element's position from localStorage.
     * @private
     */
    _restorePos() {
        this._updatePos(localStorage.getItem(this.id));
    }

    /**
     * Updates the element's position from stored data.
     * @param {string|null} storedData
     * @private
     */
    _updatePos(storedData) {
        if (!storedData) return;
        let data;
        try {
            data = JSON.parse(storedData);
        } catch {
            data = { x: 0, y: 0 };
        }
        const pos = this._getPos(data);
        this.element.dataset.translate = `{"x":${pos.x}, "y":${pos.y}}`;
        this.element.style.translate = data ? `${pos.x}px ${pos.y}px` : "";
    }

    /**
     * Removes all event listeners added by this instance.
     */
    removeListeners() {
        this.dragElement.removeEventListener('mousedown', this._boundMouseDown);
        window.removeEventListener('storage', this._boundStorage);
        window.removeEventListener("mousemove", this._boundDrag);
        window.removeEventListener("mouseup", this._boundStopDrag, { once: true });
    }

    /**
     * Disables dragging and resets position.
     */
    stop() {
        if (!this.enabled) return;
        this.removeListeners();
        this.element.dataset.translate = `{"x":0,"y":0}`;
        this.enabled = false;
    }

    /**
     * Enables dragging and restores position.
     */
    start() {
        if (this.enabled) return;
        this._setProperties();
        this._restorePos();
        this.dragElement.addEventListener('mousedown', this._boundMouseDown);
        window.addEventListener('storage', this._boundStorage);
        this.enabled = true;
    }
}