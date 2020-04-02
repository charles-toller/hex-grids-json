import HexGrid from "../src/HexGrid";
import { hexGridsReducer } from "../src/HexGrid";

test("Creates a hex grid", () => {
    let state: any = hexGridsReducer();
    const getState = () => state;
    const actionHandler = jest.fn(
        (action) => (state = hexGridsReducer(state, action))
    );
    const grid = new HexGrid<{ color: string }>(getState, actionHandler, {
        color: "white",
    });
    expect(state).toStrictEqual({
        hexes: {},
    });
    grid.getHex(0, 0);
    expect(grid.getHex(0, 0)).toMatchObject({
        color: "white",
    });
    expect(state).toMatchObject({
        hexes: {
            0: {
                0: {
                    color: "white",
                },
            },
        },
    });
    expect(actionHandler.mock.calls).toMatchObject([
        [
            {
                type: "HEX_GRIDS_CREATE_HEX",
                u: 0,
                v: 0,
                data: {
                    color: "white",
                },
            },
        ],
    ]);
});
test("creates tessellation", () => {
    let state: any = hexGridsReducer();
    const getState = () => state;
    const actionHandler = jest.fn(
        (action) => (state = hexGridsReducer(state, action))
    );
    const grid = new HexGrid<{ color: string }>(getState, actionHandler, {
        color: "white",
    });
    const center = grid.getHex(0, 0);
    center.color = "blue";
    center.southeast.color = "blue";
    center.east.color = "blue";
    center.east.east.color = "red";
    center.east.east.east.color = "blue";
    expect(
        grid.getTessellationMatching(0, 0, (tile) => tile.color === "blue")
    ).toMatchObject([
        [0, 0],
        [1, 0],
        [0, 1],
    ]);
});
test("doesHexExist", () => {
    let state: any = hexGridsReducer();
    const getState = () => state;
    const actionHandler = jest.fn(
        (action) => (state = hexGridsReducer(state, action))
    );
    const grid = new HexGrid<{ color: string }>(getState, actionHandler, {
        color: "white",
    });
    grid.getHex(0, 0);
    expect(grid.doesHexExist(0, 0)).toBe(true);
    expect(grid.doesHexExist(0, 1)).toBe(false);
});
test("iterateAllTiles", () => {
    let state: any = hexGridsReducer();
    const getState = () => state;
    const actionHandler = jest.fn(
        (action) => (state = hexGridsReducer(state, action))
    );
    const grid = new HexGrid<{ color: string }>(getState, actionHandler, {
        color: "white",
    });
    grid.getHex(0, 0);
    grid.getHex(0, 1).color = "blue";
    grid.getHex(1, 0).color = "red";
    expect(grid.iterateAllTiles((tile) => tile.color)).toMatchObject({
        0: {
            0: "white",
            1: "blue",
        },
        1: {
            0: "red",
        },
    });
});
test("modify", () => {
    let state: any = hexGridsReducer();
    const getState = () => state;
    const actionHandler = (action) => (state = hexGridsReducer(state, action));
    const grid = new HexGrid<{ color: string }>(getState, actionHandler, {
        color: "white",
    });
    grid.getHex(0, 0);
    const m = grid.modify();
    m.getHex(0, 0).color = "blue";
    const result = m.build();
    expect(state.hexes[0][0]).toMatchObject({
        color: "white",
    });
    expect(result.hexes[0][0]).toMatchObject({
        color: "blue",
    });
});
