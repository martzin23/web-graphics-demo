export default class Input {
    constructor(camera, gui) {
        this.key_states = {};
        this.camera = camera;
        this.gui = gui;

        document.addEventListener('keypress', (event) => this.keyboard_press(event.key));
        document.addEventListener('keyup', (event) => this.keyboard_release(event.key));
        document.addEventListener('mousemove', (event) => this.mouse_move(event));
        document.addEventListener('wheel', (event) => this.mouse_scroll(event));
    }

    keyboard_press(key) {
        switch (key) {
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
            case " ":
                this.gui.toggle();
                break;
        }
    }

    keyboard_release(key) {
        switch (key) {
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