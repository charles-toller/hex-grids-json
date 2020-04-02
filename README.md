hex-grids-json
=====

This is a library to overlay a hexagon grid onto your JSON data store like Redux or possibly Firebase.
The basis for this library is the grid format described [here](https://www.redblobgames.com/grids/hexagons/).
It allows you to access your data normally, with all the custom data you provide
for each hex, while providing convenience functions for accessing hexes in various
directions. Essentially, this allows you to have a denormalized data model that looks
normalized.

I recommend setting up the hexagon grid under a separate key in your data store.
This library comes with a Redux reducer that when passed no arguments, returns
the default state it expects to be able to get to. So, to initialize your store,
you can either use the built in `combineReducers` from Redux or simply call
the reducer with no arguments.

```typescript
import { hexGridsReducer } from 'hex-grids-json';
import { combineReducers } from 'redux';

// Redux way
const reducers = combineReducers({
    hexes: hexGridsReducer
});

// Manual way
const state = {
    hexes: hexGridsReducer()
};
```

From there, you'll need some function that returns your application's state.
(I'll refer to it as `getState()`, as that's what it is called in Redux.)

You'll also need some function that accepts actions out of the HexGrids class
and reduces them. You can either build some simple logic given the exported
reducer, or you can use Redux and it's built-in `dispatch()`.

Let's assume we have a Redux store, with our hex grid stored at the key 
"hexes".
Here's an example that stores the color of each hex, with a default color
of white:

```typescript
import HexGrid from 'hex-grids-json';
interface Hex {
    color: string;
}
const grid = new HexGrid<Hex>(getState, dispatch, {
    color: "white"
});
```

From here, you can access hexes, along with all the other functions included in
the class.

```typescript
// Because hex 0, 0 does not exist, it will be created with default values
const hex = grid.getHex(0, 0);
assert(hex.color).equals('white');
// This dispatches a Redux action to change this property
hex.color = 'blue';
const hex2 = hex.east; // Returns hex 1, 0
// This can continue on for a while
const hex3 = hex.east.east.east.east.east.east.east.east; // Hex 8, 0
```

Let's say your writing your own reducer, and want to use the hex library but
not emit a million actions. You can use `HexGrid.modify()`:

```typescript
const mGrid = grid.modify();
// No Redux action emitted, and therefore no change to the original hex grid.
mGrid.getHex(0, 0).color = 'blue';
assert(grid.getHex(0, 0).color).equals('white');
// However, the change is retained in the modified grid:
assert(mGrid.getHex(0, 0).color).equals('blue');
// When you want to get the state out and return it for your reducer return, use
// build():
return {
    hexes: mGrid.build()
}
// There's nothing special about the build() call, either: you could put it in
// a spread object to make manual edits after the build call as well.
```