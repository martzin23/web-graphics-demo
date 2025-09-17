export default class KEYManager {
    constructor(gpu, gui, camera) {
        this.camera = camera;
        this.gpu = gpu;
        this.gui = gui;
        this.key_states = {};
        this.mouse_states = [false, false, false, false, false];

        document.addEventListener('keydown', (event) => this.keyboardPress(event));
        document.addEventListener('keyup', (event) => this.keyboardRelease(event));
        document.addEventListener('mousedown', (event) => this.mousePress(event));
        document.addEventListener('mouseup', (event) => this.mouseRelease(event));
        // document.addEventListener('mousemove', (event) => this.mouseMove(event));
        // document.addEventListener('wheel', (event) => this.mouseScroll(event));
        document.addEventListener('mouseup', () => {if(this.gui.auto_refresh) this.gpu.refresh();});
        document.addEventListener('mousemove', () => {if((this.mousePressed() || this.camera.isEnabled()) && this.gui.auto_refresh) this.gpu.refresh();});
    }

    keyboardPress(event) {
        this.key_states[event.key] = true;
        switch (event.key) {
            case "ArrowUp":
                if (this.gui.isTyping()) return;
                this.gpu.uniforms.render_scale = Math.max(this.gpu.uniforms.render_scale - 1, 1);
                break;
            case "ArrowDown":
                if (this.gui.isTyping()) return;
                this.gpu.uniforms.render_scale = Math.min(this.gpu.uniforms.render_scale + 1, 16);
                break;
            case "F11":
                event.preventDefault();
                this.gui.toggleFullscreen();
                break;
            case "Tab":
                event.preventDefault();
                if (this.gui.isTyping()) return;
                this.gui.auto_refresh = !this.gui.auto_refresh;
                break;
        }
    }

    keyboardRelease(event) {
        this.key_states[event.key] = false;
    }

    mousePress(event) {
        this.mouse_states[event.button] = true;
    }

    mouseRelease(event) {
        this.mouse_states[event.button] = false;
    }

    // mouseMove(event) {
    //     if (this.gui.isFocused())
    //         this.camera.updateRotation(event.movementX, event.movementY);
    // }

    // mouseScroll(event) {
    //     if (this.gui.isFocused()) {
    //         if(event.deltaY < 0)
    //             this.camera.speed *= 1.25;
    //         else
    //             this.camera.speed /= 1.25;
    //     } else {
    //         this.gui.scrollTab(event.deltaY);
    //     }
    // }

    keyPressed() {
        let pressed = false;
        for (const key in this.key_states)
            if (this.key_states[key] === true)
                pressed = true;
        return pressed;
    }

    mousePressed() {
        let pressed = false;
        this.mouse_states.forEach(button => {if (button) pressed = true;});
        return pressed;
    }
}