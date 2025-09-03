export default class Input {
    constructor(gpu_manager, camera, gui) {
        this.key_states = {};
        this.camera = camera;
        this.gpu_manager = gpu_manager;
        this.gui = gui;

        document.addEventListener('keydown', (event) => this.keyboard_press(event));
        document.addEventListener('keyup', (event) => this.keyboard_release(event));
        document.addEventListener('mousemove', (event) => this.mouse_move(event));
        document.addEventListener('wheel', (event) => this.mouse_scroll(event));
    }

    keyboard_press(event) {
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
                this.gpu_manager.uniform_data.render_scale = Math.max(this.gpu_manager.uniform_data.render_scale / 2, 1);
                break;
            case "ArrowDown":
                this.gpu_manager.uniform_data.render_scale = Math.min(this.gpu_manager.uniform_data.render_scale * 2, 16);
                break;
            case "Tab":
                event.preventDefault();
                this.gui.toggle();
                break;
        }
    }

    keyboard_release(event) {
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

    mouse_move(event) {
        if (this.gui.focused())
            this.camera.rotate(event.movementX, event.movementY);
    }

    mouse_scroll(event) {
        if (this.gui.focused()) {
            if(event.deltaY < 0)
                this.camera.speed *= 1.25;
            else
                this.camera.speed /= 1.25;
        }
    }
}