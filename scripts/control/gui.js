export default class GUI {
    constructor(camera, gpu_manager) {
        this.active = true;
        this.camera = camera;
        this.canvas = document.getElementById("canvas");
        this.gpu_manager = gpu_manager;

        // this.mouse_movement = {x: 0, y: 0};
        this.value_element = null;
        this.active_function = null;
        
        this.setupCallbacks();
    }

    mouseClick(event) {
        switch (event.button) {
            case 0:
                this.toggleFocus();
                break;
            case 1:
                break;
            case 2:
                break;
        }
    }

    mouseMove(event) {
        // this.mouse_movement.x = event.movementX;
        // this.mouse_movement.y = event.movementY;
        if (this.value_element) {
            if (this.value_element.checkValidity()) {
                const value = Math.max(parseFloat(this.value_element.value) + event.movementX * 0.01, 0);
                this.value_element.value = value;
                this.active_function(value);
            }
        }
    }

    isFocused() {
        return document.pointerLockElement !== null;
    }

    isFullscreen() {
        return window.fullscreen;
    }

    toggleVisibility() {
        if (this.active)
            console.log("gui off");
        else
            console.log("gui on");
        this.active = !this.active;
    }

    toggleFullscreen() {
        if (this.isFullscreen()) {
            if (document.exitFullscreen)
                document.exitFullscreen().catch(() => {});
            else if (document.webkitExitFullscreen)
                document.webkitExitFullscreen().catch(() => {});
            else if (document.msExitFullscreen)
                document.msExitFullscreen().catch(() => {});
        } else {
            if (document.documentElement.requestFullscreen)
                document.documentElement.requestFullscreen();
            else if (document.documentElement.webkitRequestFullscreen)
                document.documentElement.webkitRequestFullscreen();
            else if (eldocument.documentElementem.msRequestFullscreen)
                document.documentElement.msRequestFullscreen();
        }
    }

    toggleFocus() {
        if (this.isFocused())
            document.exitPointerLock();
        else
            this.canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {});
    }

    setupCallbacks() {
        this.canvas.addEventListener('click', (event) => this.mouseClick(event));
        document.addEventListener("mousemove", (event) => this.mouseMove(event));
        document.addEventListener("mouseup", () => {this.value_element = null});

        // Display
        const input_resolution_value = document.getElementById('input-resolution-value');
        document.getElementById("input-resolution-increase").addEventListener("click", () => {
            this.gpu_manager.uniform_data.render_scale = Math.max(this.gpu_manager.uniform_data.render_scale / 2, 1);
            input_resolution_value.innerText = "1/" + this.gpu_manager.uniform_data.render_scale + "x";
        });
        document.getElementById("input-resolution-decrease").addEventListener("click", () => {
            this.gpu_manager.uniform_data.render_scale = Math.min(this.gpu_manager.uniform_data.render_scale * 2, 16);
            input_resolution_value.innerText = "1/" + this.gpu_manager.uniform_data.render_scale + "x";
        });

        const input_fov_drag = document.getElementById("input-fov-drag");
        input_fov_drag.addEventListener("mousedown", () => {
            this.value_element = document.getElementById("input-fov-value");
            this.active_function = function(value) {
                this.camera.fov = value;
            }
        })

        this.createButton("input-sync-resolution", () => {this.gpu_manager.syncResolution();}, "Fix Aspect Ratio");
        this.createToggle("test", (value) => { console.log(value); }, "fwan");
    }

    createButton(id, func = () => {}, name = "Name") {
        const element = document.getElementById(id);
        element.className = "button";
        element.innerText = name;
        element.addEventListener("click", func);
    }

    createToggle(id, func, name = "Name", def = false) {
        const handle = document.createElement("div");

        const bool = document.createElement("div");
        if (def)
            bool.className = "true";
        else
            bool.className = "false";
        bool.appendChild(handle);

        const text = document.createElement("p");
        text.innerText = name;

        const element = document.getElementById(id);
        element.appendChild(bool);
        element.appendChild(text);
        // element.addEventListener("click", () => {
        //     if (this.classList.indexOf("active") !== undefined) {
        //         func(true);
        //         this.classList.push("active");
        //     }
        //     else {
        //         func(false);
        //         this.classList.splice(this.classList.indexOf("active"), 1);
        //     }
        // });   
        console.log(element);
        func(def);   
    }

    createSlider(name, elem, func, def, min, max, multi, step, log) {

    }

    createToggle(name, elem, func, def, min, max, multi, step) {

    }

    createIncrement(name, elem, func, def, min, max, step) {

    }

    createColor(name, elem, func, def) {

    }
}