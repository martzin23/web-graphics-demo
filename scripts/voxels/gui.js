import * as Widgets from '../utility/widgets.js';

export default class GUIManager {
    constructor(canvas, gpu, camera, storage) {
        this.current_tab = 0;
        this.key_states = {};
        this.mouse_states = [false, false, false, false, false];
        this.update_event = new CustomEvent('updategui', {bubbles: true, cancelable: true });

        this.setupListeners(canvas, gpu, camera);
        this.setupWidgets(gpu, camera, storage);
        this.update_handler = setInterval(() => { this.updateValues(); }, 500);
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

    isFullscreen() {
        return (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) !== undefined;
    }

    isTyping() {
        return (document.activeElement.type === 'text') || (document.activeElement.nodeName === 'TEXTAREA');
    }

    isKeyPressed() {
        let pressed = false;
        for (const key in this.key_states)
            if (this.key_states[key] === true)
                pressed = true;
        return pressed;
    }

    isMousePressed() {
        let pressed = false;
        this.mouse_states.forEach(button => {
            if (button) pressed = true;
        });
        return pressed;
    }

    updateValues() {
        document.querySelectorAll("menu *").forEach(element => {element.dispatchEvent(this.update_event);});
    }
    
    switchTab(value, update_buttons = true) {
        if (update_buttons) {
            const switch_element = document.getElementById("group-tabs").firstChild;
            Widgets.switchSetIndex(switch_element, value);
        }

        const element_menu = document.getElementById("menu");
        element_menu.classList.remove("hidden");
        this.current_tab = value;

        if (value === null) {
            if (this.isFullscreen())
                element_menu.classList.add("hidden");
            switchAttribute(element_menu, 0, undefined, "hidden");
        } else {
            switchAttribute(element_menu, value + 1, undefined, "hidden");
        }
    }

    setupListeners(canvas, gpu, camera) {
        canvas.addEventListener('click', (event) => {
            if (event.button == 0)
                camera.toggle(canvas);
        });

        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((eventType) => {
            document.addEventListener(eventType, () => {
                const menu = document.getElementById("menu");

                if (!this.isFullscreen() && this.current_tab === null)
                    menu.classList.remove("hidden");
                else if (this.isFullscreen() && this.current_tab === null)
                    menu.classList.add("hidden");
            })
        });
        
        document.addEventListener('keydown', (event) => {
            this.key_states[event.key] = true;
            switch (event.key) {
                case "ArrowUp":
                    if (this.isTyping()) return;
                    gpu.uniforms.render_scale = Math.max(gpu.uniforms.render_scale - 1, 1);
                    gpu.synchronize();
                    break;
                case "ArrowDown":
                    if (this.isTyping()) return;
                    gpu.uniforms.render_scale = Math.min(gpu.uniforms.render_scale + 1, 16);
                    gpu.synchronize();
                    break;
                case "F11":
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            this.key_states[event.key] = false;
        });

        document.addEventListener('mousedown', (event) => {
            this.mouse_states[event.button] = true;
        });

        document.addEventListener('mouseup', (event) => {
            this.mouse_states[event.button] = false;
        });
    }

    setupWidgets(gpu, camera, storage) {
        Widgets.setupAddTooltip();

        Widgets.createSwitch(
            document.getElementById("group-tabs"), 
            (value) => { this.switchTab(value, false); }, 
            [
                '<i class="fa fa-cog"></i>General', 
                // '<i class="fa fa-info"></i>Controls'
            ], 
            '<i class="fa fa-cog"></i>General',
            undefined,
            true
        );

        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.toggleFullscreen(); }, () => this.isFullscreen(), "Fullscreen");
        Widgets.createIncrement(document.getElementById("group-display"), (value) => {gpu.uniforms.render_scale = value; gpu.synchronize();},() => gpu.uniforms.render_scale , "Resolution division", 1, 16).addTooltip("Higher number = lower resolution, improves performance");
        Widgets.createButton(document.getElementById("group-display"), () => {gpu.synchronize();}, "Fix aspect ratio").addTooltip("Click this if the image is stretched");
        // Widgets.createButton(document.getElementById("group-display"), () => {
        //     var current_date = new Date(); 
        //     var date_time = "" + current_date.getFullYear() + (current_date.getMonth() + 1) + current_date.getDate() + current_date.getHours() + current_date.getMinutes() + current_date.getSeconds();
        //     gpu.screenshot(date_time);
        // }, '<i class="fa fa-download"></i>Screenshot').addTooltip("Save current rendered image and download");

        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.position.x = value;}, () => camera.position.x, "X", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.position.y = value;}, () => camera.position.y, "Y Position", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.position.z = value;}, () => camera.position.z, "Z", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.rotation.x = value;}, () => camera.rotation.x, "Horizontal rotation", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.rotation.y = value;}, () => camera.rotation.y, "Vertical rotation", -90, 90, 0.1);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {camera.speed = value;}, () => camera.speed, "Speed", 0, 10, true);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {camera.sensitivity = value;}, () => camera.sensitivity, "Sensitivity", 0.01, 0.5, true);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.fov = value;}, () => camera.fov, "Field of view", 0, Infinity, 0.005);
        Widgets.createToggle(document.getElementById("group-camera"), (value) => camera.orbit_mode = value, () => camera.orbit_mode, "Orbit mode");
    }
}

function switchAttribute(element_parent, index_true, attribute_true, attribute_false) {
    Array.from(element_parent.childNodes).filter((el) => (el.nodeType !== Node.TEXT_NODE)).forEach((element, index) => {
        if (index == index_true) {
            if (attribute_true !== undefined)
                element.classList.add(attribute_true);
            if (attribute_false !== undefined)
                element.classList.remove(attribute_false);
        } else {
            if (attribute_true !== undefined)
                element.classList.remove(attribute_true);
            if (attribute_false !== undefined)
                element.classList.add(attribute_false);
        }
    });
}