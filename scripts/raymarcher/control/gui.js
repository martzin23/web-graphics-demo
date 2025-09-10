import * as Widgets from '../../utility/widgets.js';

export default class GUI {
    constructor(camera, gpu) {
        this.canvas = document.getElementById("canvas");
        this.gpu = gpu;
        this.camera = camera;
        this.update_event;
        this.auto_refresh = true;
        this.current_tab = 0;
        
        this.setupCallbacks();
        this.setupWidgets();

        document.getElementById("input-code").value = `fn SDF(p: vec3f) -> f32 {\n\treturn length(p) - 1.0;\n}`;
    }

    isFocused() {
        return document.pointerLockElement !== null;
    }

    isFullscreen() {
        return (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) !== undefined;
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

    updateValues() {
        document.querySelectorAll("menu *").forEach(element => {element.dispatchEvent(this.update_event);});
    }
    
    switchTab(value, check = true) {
        if (check) {
            document.getElementById("group-tabs").firstChild.childNodes.forEach((element, index) => {
                if (element.classList.contains("active") && index == value) {
                    element.classList.remove("active");
                    value = null;
                }
                else if (index == value)
                    element.classList.add("active");
                else
                    element.classList.remove("active");
            });
        }

        document.getElementById("menu").classList.remove("hidden");
        Array.from(document.getElementById("menu").childNodes).filter((el) => (el.nodeType !== Node.TEXT_NODE)).forEach((el) => {el.classList.add("hidden");});
        this.current_tab = value;
        switch(value) {
            case 0:
                document.getElementById("group-display").classList.remove("hidden");
                document.getElementById("group-camera").classList.remove("hidden");
                break;
            case 1:
                document.getElementById("group-shading").classList.remove("hidden");
                document.getElementById("group-lens").classList.remove("hidden");
                document.getElementById("group-sun").classList.remove("hidden");
                document.getElementById("group-marching").classList.remove("hidden");
                document.getElementById("group-sdf").classList.remove("hidden");
                document.getElementById("group-sdf-options").classList.remove("hidden");
                break;
            case 2:
                document.getElementById("group-custom-sdf").classList.remove("hidden");
                document.getElementById("group-code").classList.remove("hidden");
                break;
            case 3:
                document.getElementById("group-controls").classList.remove("hidden");
                document.getElementById("group-widgets").classList.remove("hidden");
                break;
            default:
                if (this.isFullscreen())
                    document.getElementById("menu").classList.add("hidden");
                else
                    document.getElementById("group-unselected").classList.remove("hidden");
                break;
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
                const unselected = document.getElementById("group-unselected");

                if (!this.isFullscreen() && menu.classList.contains("hidden")) {
                    menu.classList.remove("hidden");
                    unselected.classList.remove("hidden");
                } else if (this.isFullscreen() && !unselected.classList.contains("hidden")) {
                    menu.classList.add("hidden");
                    unselected.classList.add("hidden");
                }
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
    }

    setupWidgets() {
        
        // Tabs
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

        // Display
        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.toggleFullscreen(); }, () => this.isFullscreen(), "Fullscreen");
        Widgets.createIncrement(document.getElementById("group-display"), (value) => {this.gpu.uniforms.render_scale = value;},() => this.gpu.uniforms.render_scale , "Resolution division", 1, 16);
        Widgets.createButton(document.getElementById("group-display"), () => {this.gpu.syncResolution();}, "Fix aspect ratio");
        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.auto_refresh = value }, () => this.auto_refresh, "Auto refresh");
        Widgets.createButton(document.getElementById("group-display"), () => {
            var current_date = new Date(); 
            var date_time = "" 
                + current_date.getFullYear()
                + (current_date.getMonth()+1)
                + current_date.getDate()
                + current_date.getHours()
                + current_date.getMinutes()
                + current_date.getSeconds();
            this.gpu.screenshot(date_time);
        }, '<i class="fa fa-download"></i>Screenshot');

        // Camera
        Widgets.createVector(document.getElementById("group-camera"), (value) => {this.camera.position = value}, () => this.camera.position, "Position");
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.rotation.h = value;}, () => this.camera.rotation.h, "Horizontal rotation", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.rotation.v = value;}, () => this.camera.rotation.v, "Vertical rotation", -90, 90, 0.1);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {this.camera.speed = value;}, () => this.camera.speed, "Speed", 0, 10, true);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {this.camera.sensitivity = value;}, () => this.camera.sensitivity, "Sensitivity", 0.01, 0.5, true);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.fov = value;}, () => this.camera.fov, "Field of view", 0, Infinity, 0.01);
        Widgets.createButton(document.getElementById("group-camera"), () => {this.camera.position = {x: 0, y: 0, z: 0}}, "Reset position");

        // Shading
        Widgets.createSwitch(
            document.getElementById("group-shading"),
            (value) => {
                switch(value) {
                    default:
                        this.gpu.uniforms.shader_mode = 0;
                        break;
                    case 1:
                        this.gpu.uniforms.shader_mode = 1;
                        break;
                    case 2:
                        this.gpu.uniforms.shader_mode = 2;
                        break;
                    case 3:
                        this.gpu.uniforms.shader_mode = 3;
                        break;
                }
            },
            ["Marches", "Normals", "Pathtraced", "Detail"],
            "Marches",
            "Shading mode"
        ).addTooltip("Set 'Max marches' to 1 when using 'Detail' mode");

        // Lens
        Widgets.createSlider(document.getElementById("group-lens"), (value) => {this.gpu.uniforms.focus_distance = value;}, () => this.gpu.uniforms.focus_distance, "Focus distance", 0.0, 20.0, true);
        Widgets.createSlider(document.getElementById("group-lens"), (value) => {this.gpu.uniforms.focus_strength = value;}, () => this.gpu.uniforms.focus_strength, "Focus blur", 0.0, 0.1);

        // Marching
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.max_marches = value;}, () => this.gpu.uniforms.max_marches, "Max marches", 1, Infinity, 50);
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.max_bounces = value;}, () => this.gpu.uniforms.max_bounces, "Max bounces", 0, Infinity);
        Widgets.createSlider(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.epsilon = value;}, () => this.gpu.uniforms.epsilon, "Epsilon", 0.0, 0.1, true);
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu.uniforms.detail = value;}, () => this.gpu.uniforms.detail, "Detail", 0, Infinity);

        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu.uniforms.custom_a = value;}, () => this.gpu.uniforms.custom_a, "A");
        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu.uniforms.custom_b = value;}, () => this.gpu.uniforms.custom_b, "B");
        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu.uniforms.custom_c = value;}, () => this.gpu.uniforms.custom_c, "C");
        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu.uniforms.custom_d = value;}, () => this.gpu.uniforms.custom_d, "D");
        
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {this.gpu.sun_rotation.x = value;}, () => this.gpu.sun_rotation.x, "Horizontal rotation", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {this.gpu.sun_rotation.y = value;}, () => this.gpu.sun_rotation.y, "Vertical rotation", -90, 90, 0.1);

        // Widget list
        Widgets.createButton(document.getElementById("group-widgets"));
        Widgets.createToggle(document.getElementById("group-widgets"));
        Widgets.createDrag(document.getElementById("group-widgets"));
        Widgets.createIncrement(document.getElementById("group-widgets"));
        Widgets.createSlider(document.getElementById("group-widgets"));
        // Widgets.createColor(
        //     document.getElementById("group-camera"), 
        //     (value) => {document.getElementById("group-widgets").style.backgroundColor = value}, 
        //     () => document.getElementById("group-camera").style.backgroundColor, 
        //     "Color", 
        //     true);
        // };
        Widgets.createVector(document.getElementById("group-widgets"));
        Widgets.createSwitch(document.getElementById("group-widgets"));

        Widgets.createButton(document.getElementById("group-code"), () => {this.gpu.recompileShaders("../scripts/raymarcher/view/shader/sphere.wgsl");}, "Compile");
    }
}