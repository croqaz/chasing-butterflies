import { Game } from ".";
import { Logs } from "./logs";
import { Area } from "./area";
import { isDefined } from "./util";

export class Thing {
    /**
     * An object in the game.
     */
    ch: string;
    fg: string;
    bg: string;
    name: string;
    walkable: boolean;
    isActor: boolean;
    x: number;
    y: number;
    map: Area;

    constructor(visual: string, properties: Record<string, any> = {}) {
        this.ch = visual;
        if (isDefined(properties.fg)) {
            this.fg = properties.fg;
        }
        if (isDefined(properties.bg)) {
            this.bg = properties.bg;
        }
        if (isDefined(properties.name)) {
            this.name = properties.name;
        }
        if (isDefined(properties.walkable)) {
            this.walkable = properties.walkable;
        }
        if (isDefined(properties.x) && isDefined(properties.y)) {
            this.x = properties.x;
            this.y = properties.y;
            this.map = null;
        }
    }

    setPosition(map: Area, x: number, y: number): void {
        this.map = map;
        this.x = x;
        this.y = y;
    }

    canInteract(): boolean {
        return false;
    }

    interact(_: boolean): boolean {
        return false;
    }
}

export class Chest extends Thing {
    open: boolean;
    hasNet: boolean;

    constructor(properties: Record<string, any> = {}) {
        properties.name = `chest ${properties.name}`;
        properties.walkable = true;
        properties.fg = "#7c3d13";
        super('▣', properties);
        this.open = false;
        this.hasNet = false;
    }

    canInteract(): boolean {
        return !this.open;
    }

    interact(_: boolean): boolean {
        this.open = true;
        if (this.open) {
            Logs.add(`You open ${this.name}.`);
            if (this.hasNet) {
                Logs.add('<b>You find a butterfly net!</b>');
                Game.screens.playScreen.player.foundNet = true;
                Game.screens.playScreen.foundNetTime = new Date();
            } else {
                Logs.add('The chest is empty.');
            }
            Logs.pause();
            this.ch = '▨';  // Square with fill
        } else {
            this.ch = '▣';  // Black square unicode
        }
        return this.open;
    }
}

export class Entity extends Thing {
    /**
     * An entity is a moving thing.
     */
    tryMove(x: number, y: number): boolean {
        if (x < 0 || y < 0) {
            return false;
        }
        // Get thing/ entity walkable value
        const entity = this.map.getEntityAt(x, y);
        if (entity && entity.walkable) {
            this.x = x;
            this.y = y;
            return true;
        } else if (entity) {
            return false;
        }
        // Check if we can walk on the tile and simply walk onto it
        if (this.map.isWalkable(x, y)) {
            this.x = x;
            this.y = y;
            return true;
        }
        return false;
    }
}

export class Player extends Entity {
    foundNet: boolean;
    butterflies: Record<string, number>;

    constructor(properties: Record<string, any> = {}) {
        properties.fg = "#d84b37";
        super('@', properties);
        this.isActor = true;
        this.foundNet = false;
        this.butterflies = {};
    }

    tryMove(x: number, y: number): boolean {
        // Try to interact with the thing
        const entity = this.map.getEntityAt(x, y);
        if (entity && entity instanceof Butterfly) {
            if (entity.interact(this.foundNet)) {
                const type = entity.name.split(' ')[0];
                if (!this.butterflies[type]) {
                    this.butterflies[type] = 0;
                }
                this.butterflies[type]++;
                return true;
            }
            return false;
        } else if (entity && entity.canInteract()) {
            entity.interact(true);
        }
        return super.tryMove(x, y);
    }

    act(): void {
        // Re-render the screen
        Game.refresh();
        // Lock the engine and wait async for the player to press a key
        this.map.engine.lock();
    }
}

export class Butterfly extends Entity {
    agility: number;
    moveSpeed: number;

    constructor(properties: Record<string, any> = {}) {
        super('B', properties);
        this.isActor = true;
        this.agility = properties.agility || 0.5;
        this.moveSpeed = properties.moveSpeed || 0.5;
    }

    canInteract(): boolean {
        return true;
    }

    interact(foundNet: boolean): boolean {
        const w = foundNet ? "the net" : "your bare hands";
        const m = foundNet ? 1 : 1.77;
        // The player tries to catch this butterfly
        const rnd = Math.random();
        if (rnd / m <= this.agility) {
            Logs.add(`You fail to catch the ${this.name} with ${w}.`);
            if (!foundNet && rnd <= 0.12) {
                Logs.add('You should try to find that butterfly net...');
                Logs.pause();
            }
            return false;
        }
        Logs.add(`You catch ${this.name} with ${w}.`);
        Logs.pause();
        this.map.removeEntity(this);
        return true;
    }

    act(): void {
        // The butterfly doesn't move all the time
        if (Math.random() >= this.moveSpeed) { return; }
        // Flip coin to determine if moving by 1 in the positive or negative direction
        const rndMove = Math.random();
        let moveOffset = rndMove < 0.5 ? 1 : -1;
        if (this.moveSpeed > 1) {
            moveOffset = Math.round(moveOffset * rndMove * this.moveSpeed);
        }
        // Flip coin to determine if moving in x, or y direction
        if (Math.random() < 0.5) {
            if (!this.tryMove(this.x + moveOffset, this.y)) {
                this.tryMove(this.x, this.y + moveOffset);
            }
        } else {
            if (!this.tryMove(this.x, this.y + moveOffset)) {
                this.tryMove(this.x + moveOffset, this.y);
            }
        }
    }
}

export function newWhiteButterfly(name = '') {
    return new Butterfly({
        name: `white butterfly ${name}`,
        fg: "#ffffff",
        moveSpeed: 0.25,
        agility: 0.5,
    });
}

export function newGrayButterfly(name = '') {
    return new Butterfly({
        name: `gray moth ${name}`,
        fg: "#535155",
        moveSpeed: 0.25,
        agility: 0.5,
    });
}

export function newGreenButterfly(name = '') {
    return new Butterfly({
        name: `green butterfly ${name}`,
        fg: "#0f3",
        moveSpeed: 0.4,
        agility: 0.5,
    });
}

export function newAdmiralButterfly(name = '') {
    return new Butterfly({
        name: `admiral butterfly ${name}`,
        fg: "#9c2f9b",
        moveSpeed: 0.8,
        agility: 0.75,
    });
}

export function newElusiveButterfly(name = '') {
    return new Butterfly({
        name: `elusive butterfly ${name}`,
        fg: "#5ed6ea",
        bg: "#013",
        moveSpeed: 3,
        agility: 0.9,
    });
}
