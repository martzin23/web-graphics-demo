import * as Widgets from './widgets.js';

export default class GUI {
    constructor(camera, gpu_manager) {
        this.canvas = document.getElementById("canvas");
        this.gpu_manager = gpu_manager;
        this.camera = camera;
        this.update_event;
        this.auto_refresh = true;
        this.switch_tab;
        
        this.setupCallbacks();
        this.setupWidgets();
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

    updateGUI() {
        document.querySelectorAll("menu *").forEach(element => {element.dispatchEvent(this.update_event);});
    }

    setupCallbacks() {
        this.canvas.addEventListener('click', (event) => {
            if (event.button == 0)
                this.toggleFocus();
        });

        window.addEventListener('resize', () => {
            this.gpu_manager.syncResolution();
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
        
        ["click", "resize", "mousemove"].forEach(element => {
            document.addEventListener(element, () => {
                if (this.auto_refresh)
                    this.gpu_manager.uniforms.temporal_counter = 1;
            })
        });
    }

    setupWidgets() {

        // Tabs
        this.switch_tab = function(value, button = false) {
            if (!button) {
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
            switch(value) {
                case 0:
                    document.getElementById("group-display").classList.remove("hidden");
                    document.getElementById("group-camera").classList.remove("hidden");
                    break;
                case 1:
                    document.getElementById("group-shading").classList.remove("hidden");
                    document.getElementById("group-lens").classList.remove("hidden");
                    document.getElementById("group-marching").classList.remove("hidden");
                    document.getElementById("group-sdf-options").classList.remove("hidden");
                    break;
                case 2:
                    document.getElementById("group-sdf").classList.remove("hidden");
                    document.getElementById("group-sdf-options").classList.remove("hidden");
                    break;
                case 3:
                    document.getElementById("group-heightmap").classList.remove("hidden");
                    break;
                case 4:
                    document.getElementById("group-custom-sdf").classList.remove("hidden");
                    document.getElementById("group-code").classList.remove("hidden");
                    break;
                case 5:
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
        Widgets.createSwitch(
            document.getElementById("group-tabs"), 
            (value) => { this.switch_tab(value, true); }, 
            [
                '<i class="fa fa-cog"></i>General', 
                '<i class="fa fa-location-arrow"></i>RayMarching', 
                '<i class="fa fa-cube"></i>SDF',
                '<i class="fa fa-area-chart"></i>Heightmap',
                '<i class="fa fa-code"></i>Code',
                '<i class="fa fa-info"></i>Info'
            ], 
            '<i class="fa fa-cog"></i>General',
            undefined,
            true
        );

        // Display
        Widgets.createIncrement(document.getElementById("group-display"), (value) => {this.gpu_manager.uniforms.render_scale = value;},() => this.gpu_manager.uniforms.render_scale , "Resolution division", 1, 16);
        Widgets.createButton(document.getElementById("group-display"), () => {this.gpu_manager.syncResolution();}, "Fix aspect ratio");
        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.toggleFullscreen(); }, () => this.isFullscreen(), "Fullscreen");
        Widgets.createButton(document.getElementById("group-display"), () => { this.gpu_manager.uniforms.temporal_counter = 1 }, "Refresh screen");
        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.auto_refresh = value }, () => this.auto_refresh, "Auto refresh");
        Widgets.createButton(document.getElementById("group-display"), () => { this.gpu_manager.screenshot("test.png"); }, "Screenshot");

        // Camera
        Widgets.createVector(document.getElementById("group-camera"), (value) => {this.camera.position = value}, () => this.camera.position, "Position");
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.rotation.h = value;}, () => this.camera.rotation.h, "Horizontal rotation", -180, 180, 0.1);
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
                        this.gpu_manager.uniforms.shader_mode = 0;
                        break;2
                    case 1:
                        this.gpu_manager.uniforms.shader_mode = 1;
                        break;
                    case 2:
                        this.gpu_manager.uniforms.shader_mode = 2;
                        break;
                }
            },
            ["Marches", "Normals", "Path traced"],
            "Marches",
            "Shading mode"
        );

        // Lens
        Widgets.createSlider(document.getElementById("group-lens"), (value) => {this.gpu_manager.uniforms.focus_distance = value;}, () => this.gpu_manager.uniforms.focus_distance, "Focus distance", 0.0, 20.0, true);
        Widgets.createSlider(document.getElementById("group-lens"), (value) => {this.gpu_manager.uniforms.focus_strength = value;}, () => this.gpu_manager.uniforms.focus_strength, "Focus blur", 0.0, 0.1);

        // Marching
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu_manager.uniforms.max_marches = value;}, () => this.gpu_manager.uniforms.max_marches, "Max marches", 0, Infinity, 50);
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu_manager.uniforms.max_bounces = value;}, () => this.gpu_manager.uniforms.max_bounces, "Max bounces", 0, Infinity);
        Widgets.createSlider(document.getElementById("group-marching"), (value) => {this.gpu_manager.uniforms.epsilon = value;}, () => this.gpu_manager.uniforms.epsilon, "Epsilon", 0.0, 0.1, true);
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {this.gpu_manager.uniforms.detail = value;}, () => this.gpu_manager.uniforms.detail, "Detail", 0, Infinity);

        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu_manager.uniforms.custom_a = value;}, () => this.gpu_manager.uniforms.custom_a, "A");
        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu_manager.uniforms.custom_b = value;}, () => this.gpu_manager.uniforms.custom_b, "B");
        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu_manager.uniforms.custom_c = value;}, () => this.gpu_manager.uniforms.custom_c, "C");
        Widgets.createDrag(document.getElementById("group-sdf-options"), (value) => {this.gpu_manager.uniforms.custom_d = value;}, () => this.gpu_manager.uniforms.custom_d, "D");
        
        Widgets.createDrag(document.getElementById("group-marching"), (value) => {this.gpu_manager.sun_rotation.x = value;}, () => this.gpu_manager.sun_rotation.x, "Horizontal rotation", -180, 180, 0.1);
        Widgets.createDrag(document.getElementById("group-marching"), (value) => {this.gpu_manager.sun_rotation.y = value;}, () => this.gpu_manager.sun_rotation.y, "Vertical rotation", -90, 90, 0.1);

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


    }
}