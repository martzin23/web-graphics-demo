import GPUManager from './view/gpu.js';
import KEYManager from './control/key.js';
import GUIManager from './control/gui.js';
import FPSCounter from '../utility/fps.js';
import Camera from '../utility/camera.js';
import Matrix from '../utility/matrix.js';

class Engine {
    static async initialize() {
        const gpu = await GPUManager.initialize(
            document.getElementById("canvas"), 
            '../scripts/raymarcher/view/shader/compute.wgsl', 
            '../scripts/raymarcher/view/shader/render.wgsl', 
            '../scripts/raymarcher/view/shader/mandelbox.wgsl'
        );
        return new Engine(gpu);
    }

    constructor(gpu) {
        window.addEventListener('beforeunload', this.destroy);
        
        this.gpu = gpu;
        this.fps = new FPSCounter(document.getElementById("output-fps"), undefined, " fps");
        this.camera = new Camera();
        this.gui = new GUIManager(this.gpu, this.camera);
        this.key = new KEYManager(this.gpu, this.gui, this.camera);
        this.local_storage_name = "renderer-raymarcher";
        this.frame = 0;

        this.load();
        this.save_handler = setInterval(() => { this.save(); }, 5000);
        this.fps_handler = setInterval(() => this.fps.set(), 1000);
    }

    update() {
        if (this.gui.isFocused())
            this.camera.updatePosition(this.key.key_states);

        if (this.key.keyPressed() && this.gui.auto_refresh)
            this.gpu.refreshScreen();
        
        this.fps.update();
        
        this.gpu.uniforms.sun_direction = Matrix.rot2dir(this.gpu.sun_rotation.x, this.gpu.sun_rotation.y);
        this.gpu.uniforms.camera_rotation = this.camera.getRotationMatrix();
        this.gpu.uniforms.camera_position = this.camera.position;
        this.gpu.uniforms.fov = this.camera.fov;
    }

    render() {
        this.gpu.writeUniforms();
        this.gpu.render();
        this.frame++;
        this.gpu.uniforms.temporal_counter += 1;
    }

    destroy() {
        if (this.gpu) {
            this.gpu.destroy();
            this.gpu = null;
        }
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
