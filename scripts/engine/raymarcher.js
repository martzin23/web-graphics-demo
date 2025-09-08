import GPUManager from '../view/gpu_manager.js';
import Camera from '../utility/camera.js';
import Input from '../control/input.js';
import GUI from '../control/gui.js';

export default class RayMarcher {
    static async initialize() {
        const gpu_manager = await GPUManager.initialize(document.getElementById("canvas"), './scripts/view/shader/compute.wgsl', './scripts/view/shader/render.wgsl');
        return new RayMarcher(gpu_manager);
    }

    constructor(gpu_manager) {
        window.addEventListener('beforeunload', this.destroy());

        this.frame = 0;
        this.running = true;
        this.gpu_manager = gpu_manager;
        this.camera = new Camera();
        this.gui = new GUI(this.camera, this.gpu_manager);
        this.input = new Input(this.gpu_manager, this.camera, this.gui);

        this.gpu_manager.syncResolution();
        this.slow_update = setInterval(() => { this.gui.updateGUI(); }, 250);
    }
    async update() {
        if (this.gui.isFocused())
            this.camera.update(this.input.key_states);
        
        this.gpu_manager.uniforms.fov = this.camera.fov;
        this.gpu_manager.uniforms.camera_rotation = this.camera.getRotationMatrix();
        this.gpu_manager.uniforms.camera_position = this.camera.position;
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
}