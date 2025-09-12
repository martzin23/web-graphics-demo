import * as Widgets from '../../utility/widgets.js';

export default class GUI {
    constructor(gpu, camera) {
        this.canvas = document.getElementById("canvas");
        this.gpu = gpu;
        this.camera = camera;
        this.update_event;
        this.update_handler;
        this.auto_refresh = true;
        this.current_tab = 0;
        
        this.setupCallbacks();
        this.setupWidgets();
    }

    toggleFocus() {
        if (this.isFocused())
            document.exitPointerLock();
        else
            this.canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {});
    }

    isFocused() {
        return document.pointerLockElement !== null;
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
            switchAttribute(element_menu, element_menu.children.length - 1, undefined, "hidden");
        } else {
            switchAttribute(element_menu, value, undefined, "hidden");
        }
    }

    scrollTab(delta) {
        delta = delta > 0 ? -1 : 1;
        const tabs_count = document.getElementById("group-tabs").firstChild.childNodes.length;
        let target_tab;
        if (this.current_tab === null && delta < 0)
            target_tab = tabs_count - 1;
        else if (this.current_tab === null && delta > 0)
            target_tab = 0;
        else if (!(this.current_tab == 0 && delta < 0) && !(this.current_tab == tabs_count - 1 && delta > 0))
            target_tab = (this.current_tab + delta) % tabs_count;
        else
            target_tab = null;
        this.switchTab(target_tab);
    }

    setupCallbacks() {
        this.canvas.addEventListener('click', (event) => {
            if (event.button == 0)
                this.toggleFocus();
        });

        window.addEventListener('resize', () => {
            this.gpu.refreshScreen();
            this.gpu.syncResolution();
        });

        this.update_event = new CustomEvent('updategui', {
            bubbles: true,
            cancelable: true
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

        HTMLElement.prototype.addTooltip = function(tooltip, icon) {
            if (icon) {
                const i = document.createElement("i");
                i.classList.add("fa");
                i.classList.add(icon);

                const p = document.createElement("p");
                p.classList.add("button");
                p.classList.add("round");
                p.setAttribute("tooltip", tooltip);
                p.appendChild(i);

                this.appendChild(p);
            } else {
                this.setAttribute("tooltip", tooltip);
            }
        };

        this.update_handler = setInterval(() => { this.updateValues(); }, 250);

        // https://stackoverflow.com/questions/6637341/use-tab-to-indent-in-textarea
        document.getElementById('input-code').addEventListener('keydown', function(event) {
            if (event.key == 'Tab') {
                event.preventDefault();
                var start = this.selectionStart;
                var end = this.selectionEnd;

                this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 1;
            }
        });
    }

    setupWidgets() {
        Widgets.createSwitch(
            document.getElementById("group-tabs"), 
            (value) => { this.switchTab(value, false); }, 
            [
                '<i class="fa fa-cog"></i>General', 
                '<i class="fa fa-location-arrow"></i>Ray Marching', 
                '<i class="fa fa-code"></i>Custom Code',
                '<i class="fa fa-info"></i>Info'
            ], 
            '<i class="fa fa-cog"></i>General',
            undefined,
            true
        );

        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.toggleFullscreen(); }, () => this.isFullscreen(), "Fullscreen");
        Widgets.createIncrement(document.getElementById("group-display"), (value) => {this.gpu.uniforms.render_scale = value;},() => this.gpu.uniforms.render_scale , "Resolution division", 1, 16);
        Widgets.createButton(document.getElementById("group-display"), () => {this.gpu.syncResolution();}, "Fix aspect ratio");
        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.auto_refresh = value }, () => this.auto_refresh, "Auto refresh");
        Widgets.createButton(document.getElementById("group-display"), () => {
            var current_date = new Date(); 
            var date_time = "" + current_date.getFullYear() + (current_date.getMonth() + 1) + current_date.getDate() + current_date.getHours() + current_date.getMinutes() + current_date.getSeconds();
            this.gpu.screenshot(date_time);
        }, '<i class="fa fa-download"></i>Screenshot');

        Widgets.createVector(document.getElementById("group-camera"), (value) => {this.camera.position = value}, () => this.camera.position, "Position");
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.rotation.h = value;}, () => this.camera.rotation.h, "Horizontal rotation", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.rotation.v = value;}, () => this.camera.rotation.v, "Vertical rotation", -90, 90, 0.1);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {this.camera.speed = value;}, () => this.camera.speed, "Speed", 0, 10, true);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {this.camera.sensitivity = value;}, () => this.camera.sensitivity, "Sensitivity", 0.01, 0.5, true);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.fov = value;}, () => this.camera.fov, "Field of view", 0, Infinity, 0.005);
        Widgets.createButton(document.getElementById("group-camera"), () => {this.camera.position = {x: 0, y: 0, z: 0}}, "Reset position");

        Widgets.createSwitch(
            document.getElementById("group-shading"),
            (value) => { this.gpu.uniforms.shader_mode = value; },
            ["Marches", "Normals", "Pathtraced"],
            "Marches",
            "Shading mode"
        ).addTooltip("Set 'Max marches' to 1 when using 'Detail' mode");

        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.max_marches = value;}, () => this.gpu.uniforms.max_marches, "Max marches", 1, Infinity, 50);
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.max_bounces = value;}, () => this.gpu.uniforms.max_bounces, "Max bounces", 0, Infinity);
        Widgets.createSlider(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.epsilon = value;}, () => this.gpu.uniforms.epsilon, "Epsilon", 0.0, 0.1, true);
        Widgets.createSlider(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.normals_precision = value;}, () => this.gpu.uniforms.normals_precision, "Normals precision", 0.0, 0.1, true);
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.detail = value;}, () => this.gpu.uniforms.detail, "Detail", 0, Infinity);

        Widgets.createSwitch(
            document.getElementById("group-sdf"),
            async (value) => {
                let code;
                const temp = document.getElementById("group-variables");
                switchAttribute(temp, value, undefined, "hidden");
                switch (value) {
                    default: 
                        code = await (await fetch("../scripts/raymarcher/view/shader/sphere.wgsl")).text();
                        break;
                    case 1: 
                        code = await (await fetch("../scripts/raymarcher/view/shader/mandelbox.wgsl")).text();
                        break;
                    case 2:
                        code = document.getElementById("input-code").value;
                        break;
                }
                this.gpu.recompileSDF(code);
                document.getElementById("output-error").innerText = await this.gpu.getCompilationError();
            },
            ["Sphere", "Mandelbox", "Custom"],
            "Mandelbox"
        );
        
        Widgets.createDrag(document.getElementById("group-sphere"), (value) => {this.gpu.uniforms.custom_a = value;}, () => this.gpu.uniforms.custom_a, "Radius");

        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {this.gpu.uniforms.custom_a = value;}, () => this.gpu.uniforms.custom_a, "Scale").addTooltip("Keep this value near -2.0 or 2.0");
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {this.gpu.uniforms.custom_b = value;}, () => this.gpu.uniforms.custom_b, "Folding limit");
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {this.gpu.uniforms.custom_c = value;}, () => this.gpu.uniforms.custom_c, "Min radius");
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {this.gpu.uniforms.custom_d = value;}, () => this.gpu.uniforms.custom_d, "Fixed radius");

        Widgets.createDrag(document.getElementById("group-custom"), (value) => {this.gpu.uniforms.custom_a = value;}, () => this.gpu.uniforms.custom_a, "uniforms.custom_a");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {this.gpu.uniforms.custom_b = value;}, () => this.gpu.uniforms.custom_b, "uniforms.custom_b");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {this.gpu.uniforms.custom_c = value;}, () => this.gpu.uniforms.custom_c, "uniforms.custom_c");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {this.gpu.uniforms.custom_d = value;}, () => this.gpu.uniforms.custom_d, "uniforms.custom_d");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {this.gpu.uniforms.custom_e = value;}, () => this.gpu.uniforms.custom_e, "uniforms.custom_e");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {this.gpu.uniforms.custom_f = value;}, () => this.gpu.uniforms.custom_f, "uniforms.custom_f");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {this.gpu.uniforms.custom_g = value;}, () => this.gpu.uniforms.custom_g, "uniforms.custom_g");

        Widgets.createSlider(document.getElementById("group-lens"), (value) => {this.gpu.uniforms.focus_distance = value;}, () => this.gpu.uniforms.focus_distance, "Focus distance", 0.0, 20.0, true);
        Widgets.createSlider(document.getElementById("group-lens"), (value) => {this.gpu.uniforms.focus_strength = value;}, () => this.gpu.uniforms.focus_strength, "Focus blur", 0.0, 0.1);
        
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {this.gpu.sun_rotation.x = value;}, () => this.gpu.sun_rotation.x, "Horizontal rotation", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {this.gpu.sun_rotation.y = value;}, () => this.gpu.sun_rotation.y, "Vertical rotation", -90, 90, 0.1);

        document.getElementById("input-code").value = `fn SDF(p: vec3f) -> f32 {\n\tlet radius = uniforms.custom_b;\n\treturn length(p) - radius;\n}`;
        Widgets.createButton(document.getElementById("group-code"), async () => {
            const switch_element = document.querySelector("#group-sdf .switch");
            Widgets.switchSetIndex(switch_element, 2);
            switchAttribute(document.getElementById("group-variables"), 2, undefined, "hidden");

            const code = document.getElementById("input-code").value;
            this.gpu.recompileSDF(code);
            document.getElementById("output-error").innerText = await this.gpu.getCompilationError();
        }, "Compile");
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