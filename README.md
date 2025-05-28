# SimpleDraggable

SimpleDraggable is a lightweight JavaScript class for making DOM elements draggable with minimal setup and no dependencies.

It uses CSS Transform to when dragging the element to make sure there isn't much performance overhead.

Basically, if you want a simple tool to drag elements and sync their position across tabs, use this.

## Features

- Uses CSS transform
- Zero dependencies
- Optional position persistence (localStorage)
- Cross-tab sync

## Installation

You can copy `SImpleDraggable.js` into your project.

## API

### `new SimpleDraggable(id, dragElement, element, store = false, enabled = true)`

- `id` (string): Unique identifier for storing position in localStorage.
- `dragElement` (HTMLElement): The element that acts as the drag handle.
- `element` (HTMLElement): The element to move.
- `store` (boolean, optional): Persist position in localStorage. Default: `false`.
- `enabled` (boolean, optional): Enable dragging on creation. Default: `true`.

### Methods

- `start()`: Enables dragging and restores position.
- `stop()`: Disables dragging and resets position.
- `removeListeners()`: Removes all event listeners added by this instance.

## Example

```js
const handle = document.getElementById('drag-handle');
const target = document.getElementById('my-draggable');
const draggable = new SimpleDraggable('my-unique-id', handle, target, true, true);
```
