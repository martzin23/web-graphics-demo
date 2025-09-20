
export default class LocalStorage {
    constructor(name) {
        this.local_storage_name = name;
    }

    save(gpu, camera, code_element) {
        const data = {
            camera_position: camera.position,
            camera_rotation: camera.rotation,
            camera_fov: camera.fov,
            camera_speed: camera.speed,
            camera_sensitivity: camera.sensitivity,
            uniform_custom_a: gpu.uniforms.custom_a,
            uniform_custom_b: gpu.uniforms.custom_b,
            uniform_custom_c: gpu.uniforms.custom_c,
            uniform_custom_d: gpu.uniforms.custom_d,
            uniform_custom_e: gpu.uniforms.custom_e,
            custom_code: code_element.value,
        }
        localStorage.setItem(this.local_storage_name, JSON.stringify(data));
    }

    load(gpu, camera, code_element) {
        if (localStorage.getItem(this.local_storage_name)) {
            const data = JSON.parse(localStorage.getItem(this.local_storage_name));
            camera.position = data.camera_position;
            camera.rotation = data.camera_rotation;
            camera.fov = data.camera_fov;
            camera.speed = data.camera_speed;
            camera.sensitivity = data.camera_sensitivity;
            gpu.uniforms.custom_a = data.uniform_custom_a;
            gpu.uniforms.custom_b = data.uniform_custom_b;
            gpu.uniforms.custom_c = data.uniform_custom_c;
            gpu.uniforms.custom_d = data.uniform_custom_d;
            gpu.uniforms.custom_e = data.uniform_custom_e;
            code_element.value = data.custom_code;
        }
    }

    delete() {
        localStorage.removeItem(this.local_storage_name);
    }

    markGroup(element_parent) {
        
    }
}