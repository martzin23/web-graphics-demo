export default class Interface {
    constructor(camera) {
        this.fullscreen = false;
        this.active = true;
        this.camera = camera;

        this.canvas = document.getElementById("canvas");
        
        this.canvas.addEventListener('click', (event) => this.mouse_click(event.button));
        document.getElementById('a').addEventListener('click', () => {this.camera.fov *= 1.1;});
        document.getElementById('b').addEventListener('click', () => {this.camera.fov /= 1.1;});
    }

    mouse_click(button) {
        switch (button) {
            case 0:
                this.canvas.requestPointerLock({
                    unadjustedMovement: true
                }).catch(() => {});
                break;
            case 1:
                break;
            case 2:
                break;
        }
    }

    toggle() {
        if (this.active)
            console.log("interface off");
        else
            console.log("interface on");
        this.active = !this.active;
    }

    focused() {
        return document.pointerLockElement !== null;
    }
}