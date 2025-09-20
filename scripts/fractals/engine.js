import WebGLManager from './webgl_manager.js'
// import WebGPUManager from './webgpu_manager.js';
import GUIManager from './gui.js';
import FPSCounter from '../utility/fps.js';
import Camera from '../utility/camera.js';
import Matrix from '../utility/matrix.js';
import Vector from '../utility/vector.js';
import LocalStorage from '../utility/storage.js';

class Engine {
    static async initialize() {
        const gpu = await WebGLManager.initialize(document.getElementById("canvas"));
        return new Engine(gpu);
    }

    constructor(gpu) {
        this.gpu = gpu;
        this.fps = new FPSCounter(document.getElementById("output-fps"), undefined, " fps");
        this.camera = new Camera(document.getElementById("canvas"), Vector.vec(4.0), Vector.vec(-135.0, 35.0));
        this.storage = new LocalStorage("renderer-raymarcher");
        this.gui = new GUIManager(document.getElementById("canvas"), this.gpu, this.camera, this.storage);

        this.storage.load();
        this.save_handler = setInterval(() => { this.storage.save(); }, 5000);
        this.fps_handler = setInterval(() => this.fps.set(), 1000);
    }

    update() {
        this.camera.update();
        this.fps.update();
        if (this.gui.isKeyPressed() && this.gui.auto_refresh)
            this.gpu.refresh();
        
        this.gpu.uniforms.sun_direction = Matrix.rot2dir(this.gpu.sun_rotation.x, this.gpu.sun_rotation.y);
        this.gpu.uniforms.camera_rotation = this.camera.getRotationMatrix();
        this.gpu.uniforms.camera_position = this.camera.position;
        this.gpu.uniforms.fov = this.camera.fov;
    }

    render() {
        this.gpu.render();
        this.gpu.uniforms.temporal_counter += 1;
    }
}

const engine = await Engine.initialize();
let animation_id = requestAnimationFrame(animate);

async function animate() {
    engine.update();
    engine.render();
    animation_id = requestAnimationFrame(animate);
}
