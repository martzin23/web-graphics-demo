export default class Input {
    constructor(gpu_manager, camera, gui) {
        this.key_states = {};
        this.key_pressed = false;
        this.camera = camera;
        this.gpu_manager = gpu_manager;
        this.gui = gui;

        document.addEventListener('keydown', (event) => this.keyboardPress(event));
        document.addEventListener('keyup', (event) => this.keyboardRelease(event));
        document.addEventListener('mousemove', (event) => this.mouseMove(event));
        document.addEventListener('wheel', (event) => this.mouseScroll(event));
    }

    keyboardPress(event) {
        this.key_pressed = true;
        switch (event.key) {
            case "w":
                this.key_states.w = true; 
                break;
            case "s":
                this.key_states.s = true; 
                break;
            case "a":
                this.key_states.a = true;   
                break;
            case "d":
                this.key_states.d = true;  
                break;
            case "q":
                this.key_states.q = true; 
                break;
            case "e":
                this.key_states.e = true; 
                break;
            case "ArrowUp":
                this.gpu_manager.uniforms.render_scale = Math.max(this.gpu_manager.uniforms.render_scale - 1, 1);
                break;
            case "ArrowDown":
                this.gpu_manager.uniforms.render_scale = Math.min(this.gpu_manager.uniforms.render_scale + 1, 16);
                break;
            case "F11":
                event.preventDefault();
                this.gui.toggleFullscreen();
                break;
            case " ":
                event.preventDefault();
                this.gui.auto_refresh = !this.gui.auto_refresh;
                break;
        }
    }

    keyboardRelease(event) {
        this.key_pressed = false;
        switch (event.key) {
            case "w":
                this.key_states.w = false; 
                break;
            case "s":
                this.key_states.s = false; 
                break;
            case "a":
                this.key_states.a = false;   
                break;
            case "d":
                this.key_states.d = false;  
                break;
            case "q":
                this.key_states.q = false; 
                break;
            case "e":
                this.key_states.e = false; 
                break;
        }   
    }

    mouseMove(event) {
        if (this.gui.isFocused())
            this.camera.rotate(event.movementX, event.movementY);
    }

    mouseScroll(event) {
        if (this.gui.isFocused()) {
            if(event.deltaY < 0)
                this.camera.speed *= 1.25;
            else
                this.camera.speed /= 1.25;
        }
    }
}