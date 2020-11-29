import { isDefined } from "./util";

const MAX_HISTORY = 50;

export const Logs = {
    container: null as HTMLElement,
    current: null as HTMLElement,

    init: function (): void {
        this.container = document.getElementById('logs');
        this.pause();
    },

    add: function (msg: string) {
        const item = document.createElement('span');
        item.innerHTML = `${msg} `;
        this.current.appendChild(item);
        while (this.current.childNodes.length > 8) {
            this.current.removeChild(this.current.firstChild);
        }
        // Jump scroll
        this.container.scrollTop = this.container.scrollHeight;
    },

    pause(): void {
        if (isDefined(this.current) && this.current.childNodes.length === 0) {
            return;
        }
        this.current = document.createElement('p');
        this.container.appendChild(this.current);

        while (this.container.childNodes.length > MAX_HISTORY) {
            this.container.removeChild(this.container.firstChild);
        }
    },
}
