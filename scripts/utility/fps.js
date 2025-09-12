export default class FPSCounter {
    constructor(element, prefix = "", suffix = "", decimals = 0) {
        this.element = element;
        this.prefix = prefix;
        this.suffix = suffix;
        this.decimals = decimals;
        this.fps = 0.0;
        this.time_previous = performance.now();
    }

    update() {
        const time_now = performance.now();
        const delta = time_now - this.time_previous;
        this.fps = (1000 / delta).toFixed(this.decimals);
        this.time_previous = time_now;
    }

    set() {
        this.element.innerText = this.prefix + this.fps + this.suffix;
    }
}