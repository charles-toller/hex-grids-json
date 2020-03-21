interface HexState<T> {
    hexes: {[key: number]: {[key: number]: T}}
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
export function hexGridsReducer(state = {hexes: {}}, action: SetAction | DeleteAction | CreateHexAction) {
    switch (action.type) {
        case "HEX_GRIDS_SET":
            return {
                ...state,
                hexes: {
                    ...state?.hexes,
                    [action.u]: {
                        ...state?.hexes?.[action.u],
                        [action.v]: {
                            ...state?.hexes?.[action.v]?.[action.v],
                            [action.key]: action.value
                        }
                    }
                }
            }
        case "HEX_GRIDS_DELETE":
            const hex = {...state?.hexes?.[action.u]?.[action.v]};
            delete hex[action.key];
            return {
                ...state,
                hexes: {
                    ...state?.hexes,
                    [action.u]: {
                        ...state?.hexes?.[action.u],
                        [action.v]: hex
                    }
                }
            }
        case "HEX_GRIDS_CREATE_HEX":
            return {
                ...state,
                hexes: {
                    ...state?.hexes,
                    [action.u]: {
                        ...state?.hexes?.[action.u],
                        [action.v]: action.data
                    }
                }
            }
    }
    return state;
}
export default class HexGrid<T extends {}> {
    private readonly stateRetriever: () => HexState<T>;
    private readonly actionEmitter: (action: SetAction | DeleteAction | CreateHexAction) => any;
    private readonly defaultHex: T;
    private proxyCache: {[key: number]: {[key: number]: T | undefined} | undefined} = {};
    get state() {
        return this.stateRetriever();
    }
    constructor(stateRetriever: () => {}, actionEmitter: (action: SetAction | DeleteAction | CreateHexAction) => any, defaultHex: T, path: string) {
        const pathArr = path.split(".")
        this.stateRetriever = () => {
            const state = stateRetriever();
            return pathArr.reduce((last, pathPart) => last[pathPart], state);
        };
        this.actionEmitter = actionEmitter;
        this.defaultHex = defaultHex;
    }
    getHex(u: number, v: number): T {
        if (this.stateRetriever()?.hexes?.[u]?.[v] == null) {
            this.actionEmitter({
                type: "HEX_GRIDS_CREATE_HEX",
                u,
                v,
                data: {...this.defaultHex}
            });
        }
        if (this.proxyCache?.[u]?.[v] == null) {
            if (this.proxyCache[u] == null) {
                this.proxyCache[u] = {};
            }
            this.proxyCache[u]![v] = new Proxy<T>({} as any, {
                get: (target: {}, p: PropertyKey) => {
                    return this.stateRetriever().hexes[u][v][p];
                },
                set: (target: {}, p: PropertyKey, value: any) => {
                    this.actionEmitter({
                        type: "HEX_GRIDS_SET",
                        u,
                        v,
                        key: p,
                        value
                    });
                    return true;
                },
                has: (target: T, p: PropertyKey) => {
                    return p in this.stateRetriever().hexes[u][v];
                },
                deleteProperty: (target: T, p: PropertyKey) => {
                    this.actionEmitter({
                        type: "HEX_GRIDS_DELETE",
                        u,
                        v,
                        key: p
                    });
                    return true;
                },
                ownKeys: () => {
                    return Object.getOwnPropertyNames(this.stateRetriever().hexes[u][v]);
                }
            });
        }
        return this.proxyCache[u]![v]!;
    }
}