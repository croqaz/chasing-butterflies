import { Display } from "rot-js";
import { Area } from "./area";
import { Player } from "./things";

export interface GameScreen {
    subScreen?: number,
    turns?: number,
    map?: Area,
    player?: Player,
    startTime?: Date,
    foundNetTime?: Date,

    enter: () => void,
    exit: () => void,
    render: (display: Display) => void,
    handleInput: (inputType: string, event: KeyboardEvent) => void,

    generateMap?: (w: number, h: number, k?: boolean) => any,
    move?: (x: number, y: number) => void,
    wonGame?: () => boolean,
    cmd?: (s: string) => void,
}
