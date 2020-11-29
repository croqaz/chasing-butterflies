import * as rot from "rot-js";
import { Thing } from "./things";

type MapStringString = Record<string, string>;

const WALKABLE = [',', ':', ';', "'", '"', 'o', '0'];

export class Area {
    width: number;
    height: number;
    tiles: MapStringString = {};
    layers: Record<number, MapStringString> = {};
    entities: any[];
    engine: rot.Engine;
    scheduler: any;

    constructor(width: number, height: number, tiles: MapStringString, layers?: Record<number, MapStringString>) {
        this.width = width;
        this.height = height;
        this.tiles = tiles;
        this.entities = [];
        if (layers && Object.keys(layers).length) {
            this.layers = layers;
        }
        // console.log(`Creating a map of ${width}x${height} with ${Object.keys(tiles).length} tiles`);
        // Create the engine and scheduler
        this.scheduler = new rot.Scheduler.Simple();
        this.engine = new rot.Engine(this.scheduler);
    }

    keyToXY(xy: string): [number, number] {
        const [x, y] = xy.split(',');
        return [parseInt(x), parseInt(y)];
    }

    getRandomFloorPosition(w = 0, h = 0) {
        if (!w) {
            w = this.width;
        }
        if (!h) {
            h = this.height;
        }
        // Randomly return a tile which is a floor
        let tries = w * h;
        let x, y;
        while (tries > 0) {
            x = rot.RNG.getUniformInt(0, w);
            y = rot.RNG.getUniformInt(0, h);
            // Check if it's walkable and NOT an entity or decor
            // Coords inside isolated islands are invalid
            if (this.isWalkable(x, y) && this.getConnectedTiles(x, y, 24).size > 24) { break; }
            tries = tries - 1;
        }
        return { x, y };
    }

    isWalkable(x: number, y: number): boolean {
        return WALKABLE.indexOf(this.getTileAt(x, y)) !== -1;
    }
    getTileAt(x: number, y: number): string | null {
        // Make sure we are inside the bounds. If we aren't, return null tile.
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        } else {
            const key = x + "," + y;
            return this.tiles[key] || null;
        }
    }
    getEntityAt(x: number, y: number): Thing | null {
        // Iterate through all entities searching for one with matching position
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].x === x && this.entities[i].y === y) {
                return this.entities[i];
            }
        }
        return null;
    }

    getPassableNeighbors(x: number, y: number): string[] {
        const tiles: string[] = [];
        for (const [dx, dy] of [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
        ]) {
            if (this.isWalkable(x + dx, y + dy)) {
                tiles.push(`${x + dx},${y + dy}`);
            }
        }
        return tiles;
    }
    getConnectedTiles(x: number, y: number, limit: number = 24) {
        /**
         * Return all connected tiles around X, Y, using Flood Fill
         */
        const connectedTiles: Set<string> = new Set([`${x},${y}`]); // visited tiles
        const queue = [`${x},${y}`];
        while (queue.length) {
            const curr = queue.pop();
            for (const neighbor of this.getPassableNeighbors(...this.keyToXY(curr))) {
                // If neighbor is not visited
                if (!connectedTiles.has(neighbor)) {
                    connectedTiles.add(neighbor);
                    queue.push(neighbor);
                }
            }
            if (connectedTiles.size >= limit) {
                break;
            }
        }
        return connectedTiles;
    }

    addEntityAt(entity: Thing, x: number, y: number): void {
        // Make sure the entity's position is within bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw new Error('Map adding entity out of bounds');
        }
        // Propagate position to the entity itself
        entity.setPosition(this, x, y);
        // Add the entity to the list of entities
        this.entities.push(entity);
        // Check if this entity is an actor before adding them to the scheduler
        if (entity.isActor) {
            this.scheduler.add(entity, true);
        }
    }
    removeEntity(entity: Thing): void {
        // Find the entity in the list of entities if it is present
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i] == entity) {
                this.entities.splice(i, 1);
                break;
            }
        }
        // If the entity is an actor, remove them from the scheduler
        if (entity.isActor) {
            this.scheduler.remove(entity);
        }
    }
}
