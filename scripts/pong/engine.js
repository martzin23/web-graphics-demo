import WebGLManager from "./gpu.js";

class Engine {
    static async initialize() {
        const gpu = await WebGLManager.initialize(document.getElementById("canvas"));
        return new Engine(gpu);
    }

    constructor(gpu) {
        this.gpu = gpu;
    }

    update() {
    }

    render() {
        this.gpu.render();
    }
}

const engine = await Engine.initialize();
engine.render();
// let animation_id = requestAnimationFrame(animate);

// async function animate() {
//     engine.update();
//     engine.render();
//     animation_id = requestAnimationFrame(animate);
// }
