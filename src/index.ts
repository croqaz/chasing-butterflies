import * as rot from "rot-js";
import { Logs } from "./logs";
import { Area } from "./area";
import { isDefined } from "./util";
import { Player } from "./things";
import * as things from "./things";
import { GameScreen } from "./types";

type MapStringString = Record<string, string>;

// ViewPort size
export const screenWidth = 80;
export const screenHeight = 32;

// Map based on this size
export const mapWidth = 150;
export const mapHeight = 150;

const FG_COLOR = '#b7ba9d';
const BG_COLOR = '#060310';
const COLORS = {
    '#': '#b7ba9d',
    "'": '#77d051',
    '"': '#239725',
    ':': '#2d9f62',
    'o': '#ed6294',
    '0': '#e5e052',
    '.': '#535155',
    'B': '#252bc5',
} as Readonly<MapStringString>;
const BUTTERFLIES = {
    white: 20,
    gray: 15,
    green: 10,
    admiral: 5,
    elusive: 3,
} as Readonly<Record<string, number>>;


export const Game = {
    display: null as rot.Display,
    screens: {} as Record<string, GameScreen>,
    screen: null as string,

    init: function () {
        this.display = new rot.Display({
            width: screenWidth,
            height: screenHeight,
            forceSquareRatio: true,
            fontFamily: 'MuseoModerno',
            fontSize: 16,
            spacing: 0.9,
            fg: FG_COLOR,
            bg: BG_COLOR,
        });
        // Add the container to our HTML page
        const canvas = this.display.getContainer() as HTMLCanvasElement;
        canvas.id = '#game';
        document.getElementById('game').replaceWith(canvas);
        // Make sure to enable the logs
        Logs.init();

        const game = this; // So that we don't lose this
        // Create a helper function for binding to an event
        // and making it send it to the screen
        const bindEventToScreen = function (inputType: string) {
            window.addEventListener(inputType, function (ev: Event) {
                // When an event is received, send it to the screen if there is one
                if (isDefined(game.screen)) {
                    // Send the event type and data to the screen
                    const src = game.screens[game.screen];
                    src.handleInput(inputType, ev as KeyboardEvent);
                }
            });
        }
        // Bind keyboard input events
        bindEventToScreen('keydown');
        // bindEventToScreen('keypress');

        setTimeout(function () {
            // Switch to a screen
            Game.switchScreen('startScreen');
        }, 10);
    },

    refresh: function () {
        // Clear the screen
        this.display.clear();
        // Render the screen
        this.screens[this.screen].render(this.display);
    },

    switchScreen: function (s: string): void {
        // If we had a screen before, notify it that we exited
        if (isDefined(this.screen)) {
            const src = this.screens[this.screen];
            src.exit();
        }
        // Clear the display
        this.display.clear();
        // Update our current screen, notify it we entered and then render it
        this.screen = s;
        this.screens[s].enter();
        this.refresh();
    }
}

// Define the playing screen
export const playScreen: GameScreen = {
    map: null as Area,
    player: null as Player,
    turns: 0,
    startTime: null as Date,
    foundNetTime: null as Date,

    generateMap: function (mapWidth: number, mapHeight: number, keepLayers?: boolean):
        [MapStringString, Record<number, MapStringString>] {
        const tiles: MapStringString = {};
        const layers: Record<number, MapStringString> = {
            0: {},
            1: {},
            2: {},
            3: {},
        };

        let generator = new rot.Map.Cellular(mapWidth - 2, mapHeight - 2);
        generator.randomize(0.7);
        generator.create();
        generator.create(function (x: number, y: number, v: number) {
            if (!x || !y) { return; } // Don't store edges
            if (v) { return; } // Don't store walls
            const key = x + "," + y;
            const value = '"';
            tiles[key] = value;
            if (keepLayers) { layers[1][key] = value; }
        });

        generator = new rot.Map.Cellular(mapWidth - 2, mapHeight - 2);
        generator.randomize(0.7);
        generator.create(function (x: number, y: number, v: number) {
            if (!x || !y) { return; } // Don't store edges
            if (v) { return; } // Don't store walls
            const key = x + "," + y;
            let value = '';
            if (tiles[key]) {
                if (rot.RNG.getPercentage() < 18) {
                    value = "o";
                } else if (rot.RNG.getPercentage() < 9) {
                    value = "0";
                }
            } else {
                value = ':';
            }
            tiles[key] = value;
            if (keepLayers) { layers[2][key] = value; }
        });

        generator = new rot.Map.Cellular(mapWidth, mapHeight);
        generator.randomize(0.4);
        // Iteratively smoothen the map
        const totalIterations = 3;
        for (let i = 0; i < totalIterations - 1; i++) {
            generator.create();
        }
        generator.create(function (x: number, y: number, v: number) {
            if (v) { return; } // Don't store walls
            const key = x + "," + y;
            if (tiles[key]) { return; }
            const value = "'";
            tiles[key] = value;
            if (keepLayers) { layers[2][key] = value; }
        });

        if (keepLayers) {
            layers[0] = tiles;
            return [tiles, layers];
        } else
            return [tiles, null];
    },

    enter: function () {
        // Create our map from the tiles
        const [tiles, layers] = this.generateMap(mapWidth, mapHeight);
        this.map = new Area(mapWidth, mapHeight, tiles, layers);

        // Add some chests
        const chestWithNet = rot.RNG.getUniformInt(0, 10);
        for (let i = 0; i < 12; i++) {
            const { x, y } = this.map.getRandomFloorPosition();
            const chest = new things.Chest({ name: `#${i + 1}` });
            if (i === chestWithNet) { chest.hasNet = true; }
            this.map.addEntityAt(chest, x, y);
        }

        // Add the butterflies
        for (let i = 0; i < BUTTERFLIES.white; i++) {
            const { x, y } = this.map.getRandomFloorPosition();
            this.map.addEntityAt(things.newWhiteButterfly(`#${i + 1}`), x, y);
        }
        for (let i = 0; i < BUTTERFLIES.gray; i++) {
            const { x, y } = this.map.getRandomFloorPosition();
            this.map.addEntityAt(things.newGrayButterfly(`#${i + 1}`), x, y);
        }
        for (let i = 0; i < BUTTERFLIES.green; i++) {
            const { x, y } = this.map.getRandomFloorPosition();
            this.map.addEntityAt(things.newGreenButterfly(`#${i + 1}`), x, y);
        }
        for (let i = 0; i < BUTTERFLIES.admiral; i++) {
            const { x, y } = this.map.getRandomFloorPosition();
            this.map.addEntityAt(things.newAdmiralButterfly(`#${i + 1}`), x, y);
        }
        for (let i = 0; i < BUTTERFLIES.elusive; i++) {
            const { x, y } = this.map.getRandomFloorPosition();
            this.map.addEntityAt(things.newElusiveButterfly(`#${i + 1}`), x, y);
        }

        // Create the player
        this.player = new Player();
        var { x, y } = this.map.getRandomFloorPosition(screenWidth, screenHeight);
        this.map.addEntityAt(this.player, x, y);

        // Save stats
        this.startTime = new Date();
        // Start the map's engine
        this.map.engine.start();

        Logs.add('Catch all the butterflies!');
        Logs.pause();
    },

    exit: function () { console.log("Exited play screen."); },

    render: function (display: rot.Display): void {
        // Make sure the x-axis doesn't go to the left of the left bound
        let topLeftX = Math.max(0, this.player.x - (screenWidth / 2));
        // Make sure we still have enough space to fit an entire game screen
        topLeftX = Math.min(topLeftX, this.map.width - screenWidth);
        // Make sure the y-axis doesn't above the top bound
        let topLeftY = Math.max(0, this.player.y - (screenHeight / 2));
        // Make sure we still have enough space to fit an entire game screen
        topLeftY = Math.min(topLeftY, this.map.height - screenHeight);

        // Should update internal positioning?
        // const tlX = topLeftX;
        // const tlY = topLeftY;
        const brX = topLeftX + screenWidth;
        const brY = topLeftY + screenHeight;

        // Iterate through all visible map cells
        for (let x = topLeftX; x < brX; x++) {
            for (let y = topLeftY; y < brY; y++) {
                // Fetch the glyph for tile and render it to screen at offset position
                const tile: string = this.map.getTileAt(x, y) || '#';
                display.draw(
                    x - topLeftX, y - topLeftY,
                    tile, COLORS[tile], BG_COLOR,
                );
            }
        }

        const isVisible = (obj: Record<string, any>) => {
            return (
                obj.x >= topLeftX && obj.x <= brX
                &&
                obj.y >= topLeftY && obj.y <= brY
            );
        }
        // Render all things & entities, including the player
        for (let e of this.map.entities) {
            if (isVisible(e)) {
                display.draw(
                    e.x - topLeftX,
                    e.y - topLeftY,
                    e.ch, e.fg, e.bg,
                );
            }
        }

        // Show player stats
        const scoreElem = document.getElementById('score');
        if (this.player.foundNet) {
            scoreElem.innerHTML = '<h3>You are holding</h3> a butterfly net<br/><br/>';
        } else {
            scoreElem.innerHTML = '';
        }
        if (Object.keys(this.player.butterflies).length) {
            const scoreList = [];
            for (let k in this.player.butterflies) {
                scoreList.push(`${k}: ${this.player.butterflies[k]}`);
            }
            scoreElem.innerHTML += '<h3>Butterflies</h3>' + scoreList.join('<br/>');
        }
    },

    handleInput: function (inputType: string, event: KeyboardEvent): void {
        if (inputType === 'keydown') {
            // Handle game end
            if (this.wonGame()) {
                Game.switchScreen('winScreen');
                return;
            }
            // Movement
            switch (event.code) {
                case "Space":
                case "Escape":
                    // Skip a turn
                    break;
                case "KeyA":
                case "ArrowLeft":
                    this.move(-1, 0);
                    break;
                case "KeyD":
                case "ArrowRight":
                    this.move(1, 0);
                    break;
                case "KeyW":
                case "ArrowUp":
                    this.move(0, -1);
                    break;
                case "KeyS":
                case "ArrowDown":
                    this.move(0, 1);
                    break;
                default:
                    // Not a valid key
                    return;
            }
            // Save stats
            this.turns++;
            // Unlock the engine
            this.map.engine.unlock();
        }
    },

    move: function (dX: number, dY: number): void {
        const newX = this.player.x + dX;
        const newY = this.player.y + dY;
        // Try to move to the new cell
        this.player.tryMove(newX, newY);
    },

    wonGame: function (): boolean {
        for (let k in BUTTERFLIES) {
            if (this.player.butterflies[k] !== BUTTERFLIES[k]) {
                return false;
            }
        }
        return true;
    },

    cmd: function (s: string): void {
        // Different DEBUG and CHEAT commands
        const c = s.split(' ');

        if (c[0] === 'pos' && c.length === 1) {
            console.log('Position:', this.player.x, this.player.y);
        } else if (c[0] === 'tp' && c.length === 3) {
            const newX = parseInt(c[1]);
            const newY = parseInt(c[2]);
            this.player.tryMove(newX, newY);
        } else {
            console.error('Unknown command!');
            return;
        }

        // Don't take a turn, just re-render the screen
        Game.refresh();
    },
}

// Define initial start screen
const startScreen: GameScreen = {
    subScreen: 0,
    enter: function () { console.log("Entered start screen."); },
    exit: function () { console.log("Exited start screen."); },

    render: function (display: rot.Display): void {
        // Render our prompt to the screen
        if (this.subScreen === 0) {
            display.drawText(1, 1, `Chasing Butterflies`);
            display.drawText(1, 3, `Press [Enter] or [Space] to start!`);
        } else if (this.subScreen === 1) {
            display.drawText(1, 1, `It's your sister's birthday and you want to find the perfect gift`);
        } else if (this.subScreen === 2) {
            display.drawText(1, 1, `It's your sister's birthday and you want to find the perfect gift...`);
            display.drawText(1, 3, `It's not that easy...`);
        } else if (this.subScreen === 3) {
            display.drawText(1, 1, `You think long and hard and...`);
        } else {
            display.drawText(1, 1, `You think long and hard and...`);
            display.drawText(1, 3, `decide to catch all the butterflies in the garden`);
            display.drawText(1, 5, `You hope she'll appreciate the gift`);
        }
    },
    handleInput: function (inputType: string, event: KeyboardEvent): void {
        // Cycle subscreens
        if (inputType === 'keydown') {
            switch (event.code) {
                case "Enter":
                case "Space":
                case "Escape":
                    this.subScreen++;
                    Game.refresh();
                    break;
            }
            if (this.subScreen > 4) {
                Game.switchScreen('playScreen');
            }
        }
    }
}

// Define the winning screen
const winScreen: GameScreen = {
    subScreen: 0,
    enter: function () { console.log("Entered win screen."); },
    exit: function () { console.log("Exited win screen."); },

    render: function (display: rot.Display): void {
        if (this.subScreen === 0) {
            for (let i = 1; i < screenHeight - 3; i++) {
                // Generate random background colors
                const r = Math.round(Math.random() * 200);
                const g = Math.round(Math.random() * 200);
                const b = Math.round(Math.random() * 200);
                const background = rot.Color.toRGB([r, g, b]);
                display.drawText(1, i, "%b{" + background + "}You caught all the butterflies!");
            }
            display.drawText(1, screenHeight - 2, 'Press [Enter] or [Space] to continue');
        } else if (this.subScreen === 1) {
            display.drawText(1, 1, 'You give your sister the butterflies');
            display.drawText(1, 3, 'She bearhugs you and ruffles your hair');
            display.drawText(1, 5, "It's the best birthday gift EVER!");
        } else {
            let pos = 1;
            let dt = 0;
            if (playScreen.foundNetTime) {
                dt = Math.round((playScreen.foundNetTime.getTime() - playScreen.startTime.getTime()) / 60000);
                display.drawText(1, pos, `You found the butterfly net in ${dt} minutes`);
                pos += 2;
            }
            dt = Math.round((new Date().getTime() - playScreen.startTime.getTime()) / 60000);
            display.drawText(1, pos, `You finished the game in ${playScreen.turns} turns and ${dt} minutes`);
            display.drawText(1, pos + 2, 'Congratz!');
            display.drawText(1, screenHeight - 4, 'A Chasing Butterflies - made by Cristi Constantin');
            display.drawText(1, screenHeight - 2, 'Made with Rot.js');
        }
    },
    handleInput: function (inputType: string, event: KeyboardEvent): void {
        // Cycle subscreens
        if (inputType === 'keydown') {
            switch (event.code) {
                case "Enter":
                case "Space":
                case "Escape":
                    this.subScreen++;
                    Game.refresh();
                    break;
            }
        }
    }
}

// Inject all screens in the game
Game.screens = { playScreen, startScreen, winScreen };

document.addEventListener("DOMContentLoaded", function () {
    // DEBUG
    (window as any).Game = Game;
    // (window as any).playScreen = playScreen;
    // Initialize the game
    Game.init();
});
