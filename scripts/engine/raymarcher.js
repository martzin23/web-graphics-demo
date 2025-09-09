import GPUManager from '../view/gpu_manager.js';
import Camera from '../utility/camera.js';
import Input from '../control/input.js';
import GUI from '../control/gui.js';
import Matrix from '../utility/matrix.js';

export default class RayMarcher {
    static async initialize() {
        const gpu_manager = await GPUManager.initialize(document.getElementById("canvas"), './scripts/view/shader/compute.wgsl', './scripts/view/shader/render.wgsl');
        return new RayMarcher(gpu_manager);
    }

    constructor(gpu_manager) {
        window.addEventListener('beforqeunload', this.destroy());

        this.frame = 0;
        this.running = true;
        this.gpu_manager = gpu_manager;
        this.camera = new Camera();
        this.gui = new GUI(this.camera, this.gpu_manager);
        this.input = new Input(this.gpu_manager, this.camera, this.gui);

        this.load();
        this.gpu_manager.syncResolution();
        this.slow_update = setInterval(() => { this.gui.updateGUI(); }, 250);
        this.save_update = setInterval(() => { this.save(); }, 5000);
    }
    async update() {
        if (this.gui.isFocused())
            this.camera.update(this.input.key_states);
        if (this.input.key_pressed && this.gui.auto_refresh)
            this.gpu_manager.uniforms.temporal_counter = 1;
        
        this.gpu_manager.uniforms.sun_direction = Matrix.rot2dir(this.gpu_manager.sun_rotation.x, this.gpu_manager.sun_rotation.y);
        this.gpu_manager.uniforms.camera_rotation = this.camera.getRotationMatrix();
        this.gpu_manager.uniforms.camera_position = this.camera.position;
        this.gpu_manager.uniforms.fov = this.camera.fov;
    }

    render() {
        this.gpu_manager.writeUniforms();
        this.gpu_manager.render();

        this.frame++;
        this.gpu_manager.uniforms.temporal_counter += 1;
    }

    destroy() {
        if (this.gpu_manager) {
            this.gpu_manager.destroy();
            this.gpu_manager = null;
        }
    }

    save() {
        const data = {
            camera_position: this.camera.position,
            camera_fov: this.camera.fov,
            camera_speed: this.camera.speed,
            camera_rotation: this.camera.rotation,
            uniforms: this.gpu_manager.uniforms
        }
        localStorage.setItem("renderer-raymarcher", JSON.stringify(data));
    }

    load() {
        if (localStorage.getItem("renderer-raymarcher")) {
            const data = JSON.parse(localStorage.getItem("renderer-raymarcher"));
            this.camera.position = data.camera_position;
            this.camera.rotation = data.camera_rotation;
            this.camera.fov = data.camera_fov;
            this.camera.speed = data.camera_speed;
            this.gpu_manager.uniforms = data.uniforms;
        }
    }
}