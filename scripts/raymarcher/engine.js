import WebGLManager from './webgl_manager.js'
// import WebGPUManager from './webgpu_manager.js';
import GUIManager from './gui.js';
import FPSCounter from '../utility/fps.js';
import Camera from '../utility/camera.js';
import Matrix from '../utility/matrix.js';
import Vector from '../utility/vector.js';

class Engine {
    static async initialize() {
        const gpu = await WebGLManager.initialize(
            document.getElementById("canvas"), 
            '../scripts/raymarcher/shader/compute.glsl', 
            '../scripts/raymarcher/shader/render.glsl', 
            '../scripts/raymarcher/shader/sphere.glsl'
        );
        return new Engine(gpu);
    }

    constructor(gpu) {
        this.gpu = gpu;
        this.fps = new FPSCounter(document.getElementById("output-fps"), undefined, " fps");
        this.camera = new Camera(Vector.vec(4.0), Vector.vec(-135.0, 35.0));
        this.gui = new GUIManager(this.gpu, this.camera);
        this.local_storage_name = "renderer-raymarcher";
        this.frame = 0;

        this.load();
        this.save_handler = setInterval(() => { this.save(); }, 5000);
        this.fps_handler = setInterval(() => this.fps.set(), 1000);
    }

    update() {
        this.camera.update();
        this.fps.update();
        if (this.gui.keyPressed() && this.gui.auto_refresh)
            this.gpu.refresh();
        
        this.gpu.uniforms.sun_direction = Matrix.rot2dir(this.gpu.sun_rotation.x, this.gpu.sun_rotation.y);
        this.gpu.uniforms.camera_rotation = this.camera.getRotationMatrix();
        this.gpu.uniforms.camera_position = this.camera.position;
        this.gpu.uniforms.fov = this.camera.fov;
    }

    render() {
        this.gpu.render();
        this.frame++;
        this.gpu.uniforms.temporal_counter += 1;
    }

    save() {
        const data = {
            camera_position: this.camera.position,
            camera_fov: this.camera.fov,
            camera_speed: this.camera.speed,
            camera_rotation: this.camera.rotation,
            uniform_custom_a: this.gpu.uniforms.custom_a,
            uniform_custom_b: this.gpu.uniforms.custom_b,
            uniform_custom_c: this.gpu.uniforms.custom_c,
            uniform_custom_d: this.gpu.uniforms.custom_d,
            uniform_custom_e: this.gpu.uniforms.custom_e,
            custom_code: document.getElementById("input-code").value,
        }
        localStorage.setItem(this.local_storage_name, JSON.stringify(data));
    }

    load() {
        if (localStorage.getItem(this.local_storage_name)) {
            const data = JSON.parse(localStorage.getItem(this.local_storage_name));
            this.camera.position = data.camera_position;
            this.camera.rotation = data.camera_rotation;
            this.camera.fov = data.camera_fov;
            this.camera.speed = data.camera_speed;
            this.gpu.uniforms.custom_a = data.uniform_custom_a;
            this.gpu.uniforms.custom_b = data.uniform_custom_b;
            this.gpu.uniforms.custom_c = data.uniform_custom_c;
            this.gpu.uniforms.custom_d = data.uniform_custom_d;
            this.gpu.uniforms.custom_e = data.uniform_custom_e;
            document.getElementById("input-code").value = data.custom_code;
        }
    }
}

const engine = await Engine.initialize();
let animation_id = requestAnimationFrame(animate);

async function animate() {
    engine.update();
    engine.render();
    animation_id = requestAnimationFrame(animate);
}
