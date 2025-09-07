import * as Widgets from './widgets.js';

export default class GUI {
    constructor(camera, gpu_manager) {
        this.canvas = document.getElementById("canvas");
        this.gpu_manager = gpu_manager;
        this.camera = camera;
        this.update_event;
        
        this.setupGUI();
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

    setupGUI() {
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
        })

        // Tabs
        Widgets.createSwitch(
            document.getElementById("group-tabs"), 
            (value) => {
                document.getElementById("menu").classList.remove("hidden");
                Array.from(document.getElementById("menu").childNodes).filter((el) => (el.nodeType !== Node.TEXT_NODE)).forEach((el) => {el.classList.add("hidden");});
                
                switch(value) {
                    case '<i class="fa fa-cog"></i>General':
                        document.getElementById("group-display").classList.remove("hidden");
                        document.getElementById("group-camera").classList.remove("hidden");
                        document.getElementById("group-widgets").classList.remove("hidden");
                        break;
                    case '<i class="fa fa-location-arrow"></i>RayMarching':
                        break;
                    case '<i class="fa fa-cube"></i>SDF':
                        break;
                    case '<i class="fa fa-area-chart"></i>Heightmap':
                        break;
                    case '<i class="fa fa-code"></i>Code':
                        break;
                    case '<i class="fa fa-info"></i>Info':
                        document.getElementById("group-info").classList.remove("hidden");
                        document.getElementById("group-controls").classList.remove("hidden");
                        break;
                    default:
                        if (this.isFullscreen())
                            document.getElementById("menu").classList.add("hidden");
                        else
                            document.getElementById("group-unselected").classList.remove("hidden");
                        break;
                }
            }, 
            [
                '<i class="fa fa-cog"></i>General', 
                '<i class="fa fa-location-arrow"></i>RayMarching', 
                '<i class="fa fa-cube"></i>SDF',
                '<i class="fa fa-area-chart"></i>Heightmap',
                '<i class="fa fa-code"></i>Code',
                '<i class="fa fa-info"></i>Info'
            ], 
            '<i class="fa fa-cog"></i>General'
        );

        // Display
        Widgets.createIncrement(document.getElementById("group-display"), (value) => {this.gpu_manager.uniform_data.render_scale = value;},() => this.gpu_manager.uniform_data.render_scale , "Resolution division", 1, 16, 2, true);
        Widgets.createButton(document.getElementById("group-display"), () => {this.gpu_manager.syncResolution();}, "Fix Aspect Ratio");

        // Camera
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {this.camera.fov = value;}, () => this.camera.fov, "FOV", 0, Infinity, 0.01);
        // Widgets.createDrag("group-camera", (value) => {this.camera.position.x = parseFloat(value);}, "Position X");
        // Widgets.createDrag("group-camera", (value) => {this.camera.position.y = parseFloat(value);}, "Position Y");
        // Widgets.createDrag("group-camera", (value) => {this.camera.position.z = parseFloat(value);}, "Position Z");
        Widgets.createVector(document.getElementById("group-camera"), (value) => {this.camera.position = value}, () => this.camera.position, "Test");
        Widgets.createToggle(
            document.getElementById("group-display"),
            (value) => { this.toggleFullscreen(); },
            () => this.isFullscreen(),
            "Fullscreen",
        );

        // Widgets.createColor(
        //     document.getElementById("group-camera"), 
        //     (value) => {document.getElementById("group-camera").style.backgroundColor = value}, 
        //     () => document.getElementById("group-camera").style.backgroundColor, 
        //     "Color", 
        //     true);
        // };
    }
}