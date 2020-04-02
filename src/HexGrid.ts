interface HexState<T> {
    hexes: { [key: number]: { [key: number]: T } };
}
export interface SetAction {
    type: "HEX_GRIDS_SET";
    u: number;
    v: number;
    key: PropertyKey;
    value: any;
}
export interface DeleteAction {
    type: "HEX_GRIDS_DELETE";
    u: number;
    v: number;
    key: PropertyKey;
}
export interface CreateHexAction {
    type: "HEX_GRIDS_CREATE_HEX";
    u: number;
    v: number;
    data: any;
}
const positional = {
    northeast: [1, -1],
    east: [1, 0],
    southeast: [0, 1],
    southwest: [-1, 1],
    west: [-1, 0],
    northwest: [0, -1],
};
const positionalKeys = Object.keys(positional);
type Hex<T> = {
    northeast: Hex<T>;
    east: Hex<T>;
    southeast: Hex<T>;
    southwest: Hex<T>;
    west: Hex<T>;
    northwest: Hex<T>;
} & T;
export function hexGridsReducer(
    state = { hexes: {} },
    action?: SetAction | DeleteAction | CreateHexAction
) {
    switch (action?.type) {
        case "HEX_GRIDS_SET":
            return {
                ...state,
                hexes: {
                    ...state?.hexes,
                    [action.u]: {
                        ...state?.hexes?.[action.u],
                        [action.v]: {
                            ...state?.hexes?.[action.u]?.[action.v],
                            [action.key]: action.value,
                        },
                    },
                },
            };
        case "HEX_GRIDS_DELETE":
            const hex = { ...state?.hexes?.[action.u]?.[action.v] };
            delete hex[action.key];
            return {
                ...state,
                hexes: {
                    ...state?.hexes,
                    [action.u]: {
                        ...state?.hexes?.[action.u],
                        [action.v]: hex,
                    },
                },
            };
        case "HEX_GRIDS_CREATE_HEX":
            return {
                ...state,
                hexes: {
                    ...state?.hexes,
                    [action.u]: {
                        ...state?.hexes?.[action.u],
                        [action.v]: action.data,
                    },
                },
            };
    }
    return state;
}
interface Modify<T> {
    build(): HexState<T>;
}
export default class HexGrid<T extends {}> {
    private readonly stateRetriever: () => HexState<T>;
    private readonly actionEmitter: (
        action: SetAction | DeleteAction | CreateHexAction
    ) => any;
    private readonly defaultHex: T;
    private proxyCache: {
        [key: number]: { [key: number]: Hex<T> | undefined } | undefined;
    } = {};
    get state() {
        return this.stateRetriever();
    }
    constructor(
        stateRetriever: () => {},
        actionEmitter: (
            action: SetAction | DeleteAction | CreateHexAction
        ) => any,
        defaultHex: T,
        path?: string
    ) {
        const pathArr = (path || "").split(".");
        this.stateRetriever = () => {
            const state = stateRetriever() as any;
            if (typeof path === "undefined") return state;
            return pathArr.reduce((last, pathPart) => last[pathPart], state);
        };
        this.actionEmitter = actionEmitter;
        this.defaultHex = defaultHex;
    }
    modify(state: HexState<T>): HexGrid<T> & Modify<T> {
        let built = false;
        let cachedState = state;
        const actionEmitter = (
            action: SetAction | DeleteAction | CreateHexAction
        ) => {
            if (!built) {
                cachedState = hexGridsReducer(cachedState, action);
            } else {
                throw new Error(
                    "Cannot modify a HexGrid.modify() object after it has been built"
                );
            }
        };
        const grid = new HexGrid<T>(
            () => cachedState,
            actionEmitter,
            this.defaultHex
        );
        Object.defineProperty(grid, "build", {
            value: () => {
                built = true;
                return cachedState;
            },
            writable: false,
            configurable: false,
        });
        return grid as HexGrid<T> & Modify<T>;
    }
    getTessellationMatching(
        u: number,
        v: number,
        cb: (tile: Hex<T>) => boolean,
        ignoring: Array<[number, number]> = []
    ): Array<[number, number]> {
        const results: Array<[number, number]> = [];
        ignoring.push([u, v]);
        const tempState = this.stateRetriever().hexes;
        if (cb(this.getHex(u, v))) {
            results.push([u, v]);
            for (let direction of positionalKeys) {
                let hex = [
                    u + positional[direction][0],
                    v + positional[direction][1],
                ];
                if (ignoring.some((a) => a[0] === hex[0] && a[1] === hex[1]))
                    continue;
                if (tempState?.[hex[0]]?.[hex[1]] == null) continue;
                results.push(
                    ...this.getTessellationMatching(
                        hex[0],
                        hex[1],
                        cb,
                        ignoring
                    )
                );
            }
        }
        return results;
    }
    iterateAllTiles<K>(
        cb: (tile: Hex<T>) => K
    ): { [key: number]: { [key: number]: K } } {
        const state = this.stateRetriever().hexes;
        const result = {};
        for (let i in state) {
            if (!state.hasOwnProperty(i)) continue;
            result[i] = {};
            for (let j in state[i]) {
                if (!state[i].hasOwnProperty(j)) continue;
                result[i][j] = cb(this.getHex(parseInt(i), parseInt(j)));
            }
        }
        return result;
    }
    doesHexExist(u: number, v: number): boolean {
        return this.stateRetriever()?.hexes?.[u]?.[v] != null;
    }
    getHex(u: number, v: number): Hex<T> {
        if (this.stateRetriever()?.hexes?.[u]?.[v] == null) {
            this.actionEmitter({
                type: "HEX_GRIDS_CREATE_HEX",
                u,
                v,
                data: { ...this.defaultHex },
            });
        }
        if (this.proxyCache?.[u]?.[v] == null) {
            if (this.proxyCache[u] == null) {
                this.proxyCache[u] = {};
            }
            this.proxyCache[u]![v] = new Proxy<Hex<T>>({} as any, {
                get: (target: {}, p: PropertyKey) => {
                    if (positionalKeys.some((a) => a === p)) {
                        return this.getHex(
                            u + positional[p][0],
                            v + positional[p][1]
                        );
                    }
                    if (p === "__hexGridsProxy") {
                        return this.stateRetriever().hexes[u][v];
                    }
                    return this.stateRetriever().hexes[u][v][p];
                },
                set: (target: {}, p: PropertyKey, value: any) => {
                    if (
                        typeof value === "object" &&
                        value != null &&
                        value.__hexGridsProxy
                    ) {
                        // Don't double proxy us
                        value = value.__hexGridsProxy;
                    }
                    this.actionEmitter({
                        type: "HEX_GRIDS_SET",
                        u,
                        v,
                        key: p,
                        value,
                    });
                    return true;
                },
                has: (target: Hex<T>, p: PropertyKey) => {
                    return p in this.stateRetriever().hexes[u][v];
                },
                deleteProperty: (target: Hex<T>, p: PropertyKey) => {
                    this.actionEmitter({
                        type: "HEX_GRIDS_DELETE",
                        u,
                        v,
                        key: p,
                    });
                    return true;
                },
                ownKeys: () => {
                    return Object.getOwnPropertyNames(
                        this.stateRetriever().hexes[u][v]
                    );
                },
                getOwnPropertyDescriptor: (
                    target: Hex<T>,
                    p: PropertyKey
                ): PropertyDescriptor | undefined => {
                    return Object.getOwnPropertyDescriptor(
                        this.stateRetriever().hexes[u][v],
                        p
                    );
                },
                getPrototypeOf: (): object | null => {
                    return Object.getPrototypeOf(
                        this.stateRetriever().hexes[u][v]
                    );
                },
                setPrototypeOf: (): boolean => {
                    return false;
                },
                isExtensible: (): boolean => {
                    return Object.isExtensible(
                        this.stateRetriever().hexes[u][v]
                    );
                },
                preventExtensions: (): boolean => {
                    Object.preventExtensions(this.stateRetriever().hexes[u][v]);
                    return true;
                },
                defineProperty: (
                    target: Hex<T>,
                    p: PropertyKey,
                    attributes: PropertyDescriptor
                ): boolean => {
                    Object.defineProperty(
                        this.stateRetriever().hexes[u][v],
                        p,
                        attributes
                    );
                    return true;
                },
                apply: (target: Hex<T>, thisArg: any, argArray?: any): any => {
                    return Function.prototype.apply.apply(
                        this.stateRetriever().hexes[u][v] as any,
                        [thisArg, argArray]
                    );
                },
                construct: (target: Hex<T>, argArray: any): object => {
                    return new (this.stateRetriever().hexes[u][v] as any)(
                        ...argArray
                    );
                },
            });
        }
        return this.proxyCache[u]![v]!;
    }
}
