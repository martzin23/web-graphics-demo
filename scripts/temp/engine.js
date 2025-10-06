import WebGLManager from '../voxels/gpu.js'
import Camera from '../utility/camera.js';
import * as Vector from '../utility/vector.js';
import * as Loader from '../utility/loader.js';
import * as WebGL from '../utility/webgl.js';

class Engine {
    static async initialize() {
        const gpu = await WebGLManager.initialize(document.getElementById("canvas"));
        return new Engine(gpu);
    }

    constructor(gpu) {
        this.gpu = gpu;
        this.camera = new Camera(document.getElementById("canvas"), Vector.vec(this.gpu.height_texture.width), Vector.vec(-135.0, 35.0), 0.3, 5.0, 0.5, false, true);
        const canvas = document.getElementById("canvas");

        canvas.addEventListener("click", () => {
            this.camera.toggle(canvas);
        });

        document.addEventListener("keypress", (event) => {
            if (event.key == " ")
                this.camera.orbit_mode = !this.camera.orbit_mode;
        });

        document.getElementById("input-fetch").addEventListener("click", async () => {
            const z = document.getElementById("input-z").value;
            const x = document.getElementById("input-x").value;
            const y = document.getElementById("input-y").value;
            const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
            const element_error = document.getElementById("output-error");

            try {
                const image = await Loader.loadImage(url);
                this.gpu.height_texture.store(this.gpu.gl, image.data);
                element_error.innerText = "";
            } catch (error) {
                element_error.innerText = "Invalid set of coordinates! X and Y should be lower than (2^Z - 1).";
            }
        });

        document.getElementById("input-fetch").click();
    }

    update() {
        this.camera.update();
        this.gpu.uniforms.camera_rotation = this.camera.getRotationMatrix();
        this.gpu.uniforms.camera_position = this.camera.position;
        this.gpu.uniforms.fov = this.camera.fov;
    }

    render() {
        this.gpu.render();
    }
}

const engine = await Engine.initialize();
let animation_id = requestAnimationFrame(animate);

async function animate() {
    engine.update();
    engine.render();
    animation_id = requestAnimationFrame(animate);
}