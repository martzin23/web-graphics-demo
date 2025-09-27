import * as Widgets from '../utility/widgets.js';

export default class GUIManager {
    constructor(canvas, gpu, camera, storage) {
        this.auto_refresh = true;
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
        
        document.addEventListener('keydown', (event) => {
            this.key_states[event.key] = true;
            switch (event.key) {
                case "ArrowUp":
                    if (this.isTyping()) return;
                        gpu.uniforms.render_scale = Math.max(gpu.uniforms.render_scale - 1, 1);
                    break;
                case "ArrowDown":
                    if (this.isTyping()) return;
                        gpu.uniforms.render_scale = Math.min(gpu.uniforms.render_scale + 1, 16);
                    break;
                case "F11":
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                case "Tab":
                    event.preventDefault();
                    if (this.isTyping()) return;
                    this.auto_refresh = !this.auto_refresh;
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
        
        document.addEventListener('mouseup', () => {
            if (this.auto_refresh)
                gpu.refresh();
        });
        
        document.addEventListener('wheel', (event) => {
            if (camera.isOrbiting()) {
                gpu.refresh();
            }
        });

        document.addEventListener('mousemove', () => {
            if ((this.isMousePressed() || camera.isEnabled()) && this.auto_refresh)
                gpu.refresh();
        });

        document.addEventListener("touchmove", (event) => {
            if (this.auto_refresh)
                gpu.refresh();
        });
    }

    setupWidgets(gpu, camera, storage) {
        Widgets.setupAddTooltip();

        Widgets.createSwitch(
            document.getElementById("group-tabs"), 
            (value) => { this.switchTab(value, false); }, 
            [
                '<i class="fa fa-cog"></i>General', 
                '<i class="fa fa-location-arrow"></i>Ray Marching', 
                '<i class="fa fa-code"></i>Custom Code',
                '<i class="fa fa-info"></i>Controls'
            ], 
            '<i class="fa fa-cog"></i>General',
            undefined,
            true
        );

        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.toggleFullscreen(); }, () => this.isFullscreen(), "Fullscreen");
        Widgets.createIncrement(document.getElementById("group-display"), (value) => {gpu.uniforms.render_scale = value;},() => gpu.uniforms.render_scale , "Resolution division", 1, 16).addTooltip("Higher number = lower resolution, improves performance");
        Widgets.createButton(document.getElementById("group-display"), () => {gpu.synchronize();}, "Fix aspect ratio").addTooltip("Click this if the image is stretched");
        Widgets.createToggle(document.getElementById("group-display"), (value) => { this.auto_refresh = value }, () => this.auto_refresh, "Auto refresh").addTooltip("Disable this when taking screenshots, otherwise the image will be noisy");
        Widgets.createButton(document.getElementById("group-display"), () => {
            var current_date = new Date(); 
            var date_time = "" + current_date.getFullYear() + (current_date.getMonth() + 1) + current_date.getDate() + current_date.getHours() + current_date.getMinutes() + current_date.getSeconds();
            gpu.screenshot(date_time);
        }, '<i class="fa fa-download"></i>Screenshot').addTooltip("Save current rendered image and download");

        Widgets.createButton(document.getElementById("group-misc"), () => {
            storage.delete();
            location.reload();
        }, '<i class="fa fa-refresh"></i>Reset variables').addTooltip("Click this if you can't see anything or if some values became invalid");

        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.position.x = value;}, () => camera.position.x, "X", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.position.y = value;}, () => camera.position.y, "Y Position", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.position.z = value;}, () => camera.position.z, "Z", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.rotation.x = value;}, () => camera.rotation.x, "Horizontal rotation", -Infinity, Infinity, 0.1);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.rotation.y = value;}, () => camera.rotation.y, "Vertical rotation", -90, 90, 0.1);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {camera.speed = value;}, () => camera.speed, "Speed", 0, 10, true);
        Widgets.createSlider(document.getElementById("group-camera"), (value) => {camera.sensitivity = value;}, () => camera.sensitivity, "Sensitivity", 0.01, 0.5, true);
        Widgets.createDrag(document.getElementById("group-camera"), (value) => {camera.fov = value;}, () => camera.fov, "Field of view", 0, Infinity, 0.005);
        storage.markGroup("group-camera");

        Widgets.createSwitch(
            document.getElementById("group-shading"),
            (value) => { gpu.uniforms.shader_mode = value; },
            ["Marches", "Normals", "Phong", "Pathtraced"],
            "Marches"
        ).addTooltip("Method of displaying the surface of a body");

        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {gpu.uniforms.max_marches = value;}, () => gpu.uniforms.max_marches, "Max marches", 1, Infinity, 25).addTooltip("Maximum ammount of steps a ray can take");
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {gpu.uniforms.max_bounces = value;}, () => gpu.uniforms.max_bounces, "Max bounces", 0, Infinity).addTooltip("Maximum ammount of light bounces (for Pathtraced shading mode only)");
        Widgets.createSlider(document.getElementById("group-marching"), (value) => {gpu.uniforms.epsilon = value;}, () => gpu.uniforms.epsilon, "Epsilon", 0.0, 0.1, true).addTooltip("Arbitrary small value used for calculation, increase if you see glitches or lighting artifacts, decrease for higher precision");
        Widgets.createSlider(document.getElementById("group-marching"), (value) => {gpu.uniforms.normals_precision = value;}, () => gpu.uniforms.normals_precision, "Normals precision", 0.0, 0.1, true).addTooltip("Precision of calculating the surface direction");
        Widgets.createIncrement(document.getElementById("group-marching"), (value) => {gpu.uniforms.detail = value;}, () => gpu.uniforms.detail, "Detail", 0, Infinity).addTooltip("Complexity of a fractal, heavy on performance");

        document.getElementById("input-code").value = `float SDF(vec3 p) {\n\tfloat radius = uniforms.custom_b;\n\treturn length(p) - radius;\n}`;
        Widgets.createSwitch(
            document.getElementById("group-sdf"),
            async (value) => {
                let code;
                const temp = document.getElementById("group-variables");
                switchAttribute(temp, value, undefined, "hidden");
                switch (value) {
                    default: 
                        code = document.getElementById("input-code").value;
                        gpu.uniforms.custom_a = 1.0;
                        gpu.uniforms.custom_b = 1.0;
                        gpu.uniforms.custom_c = 1.0;
                        gpu.uniforms.custom_d = 1.0;
                        gpu.uniforms.custom_e = 1.0;
                        break;
                    case 1: 
                        code = await (await fetch("../scripts/fractals/shader/mandelbox.glsl")).text();
                        gpu.uniforms.custom_a = -2.0;
                        gpu.uniforms.custom_b = 1.0;
                        gpu.uniforms.custom_c = 0.5;
                        gpu.uniforms.custom_d = 2.0;
                        gpu.uniforms.custom_e = 2.0;
                        break;
                    case 2:
                        code = await (await fetch("../scripts/fractals/shader/mandelbulb.glsl")).text();
                        gpu.uniforms.custom_a = 5.0;
                        gpu.uniforms.custom_b = 1.0;
                        gpu.uniforms.custom_c = 1.0;
                        gpu.uniforms.custom_d = 1.0;
                        gpu.uniforms.custom_e = 1.0;
                        break;
                    case 3: 
                        code = await (await fetch("../scripts/fractals/shader/kochcurve.glsl")).text();
                        gpu.uniforms.custom_a = 1.0;
                        gpu.uniforms.custom_b = 1.0;
                        gpu.uniforms.custom_c = 1.0;
                        gpu.uniforms.custom_d = 1.0;
                        gpu.uniforms.custom_e = 1.0;
                        break;
                    case 4: 
                        code = await (await fetch("../scripts/fractals/shader/juliabulb.glsl")).text();
                        gpu.uniforms.custom_a = 3.0;
                        gpu.uniforms.custom_b = 1.0;
                        gpu.uniforms.custom_c = 1.0;
                        gpu.uniforms.custom_d = 1.0;
                        gpu.uniforms.custom_e = 1.0;
                        break;
                }
                const message = await gpu.recompile(code);
                document.getElementById("output-error").innerText = message;
            },
            ["Custom", "Mandelbox", "Mandelbulb", "Koch curve", "Juliabulb"],
            "Custom"
        ).addTooltip("The type of body that is being rendered");

        Widgets.createDrag(document.getElementById("group-custom"), (value) => {gpu.uniforms.custom_a = value;}, () => gpu.uniforms.custom_a, "uniforms.custom_a");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {gpu.uniforms.custom_b = value;}, () => gpu.uniforms.custom_b, "uniforms.custom_b");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {gpu.uniforms.custom_c = value;}, () => gpu.uniforms.custom_c, "uniforms.custom_c");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {gpu.uniforms.custom_d = value;}, () => gpu.uniforms.custom_d, "uniforms.custom_d");
        Widgets.createDrag(document.getElementById("group-custom"), (value) => {gpu.uniforms.custom_e = value;}, () => gpu.uniforms.custom_e, "uniforms.custom_e");
        storage.markGroup("group-custom");
        
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {gpu.uniforms.custom_a = value;}, () => gpu.uniforms.custom_a, "Scale");
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {gpu.uniforms.custom_b = value;}, () => gpu.uniforms.custom_b, "Folding limit");
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {gpu.uniforms.custom_c = value;}, () => gpu.uniforms.custom_c, "Min radius");
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {gpu.uniforms.custom_d = value;}, () => gpu.uniforms.custom_d, "Fixed radius");
        Widgets.createDrag(document.getElementById("group-mandelbox"), (value) => {gpu.uniforms.custom_e = value;}, () => gpu.uniforms.custom_e, "Folding value");

        Widgets.createDrag(document.getElementById("group-mandelbulb"), (value) => {gpu.uniforms.custom_a = value;}, () => gpu.uniforms.custom_a, "Power");

        Widgets.createDrag(document.getElementById("group-kochcurve"), (value) => {gpu.uniforms.custom_a = value;}, () => gpu.uniforms.custom_a, "Scale");
        Widgets.createDrag(document.getElementById("group-kochcurve"), (value) => {gpu.uniforms.custom_b = value;}, () => gpu.uniforms.custom_b, "Spacing");
        Widgets.createDrag(document.getElementById("group-kochcurve"), (value) => {gpu.uniforms.custom_c = value;}, () => gpu.uniforms.custom_c, "Inversion");

        Widgets.createDrag(document.getElementById("group-juliabulb"), (value) => {gpu.uniforms.custom_a = value;}, () => gpu.uniforms.custom_a, "Exponent");
        Widgets.createDrag(document.getElementById("group-juliabulb"), (value) => {gpu.uniforms.custom_b = value;}, () => gpu.uniforms.custom_b, "Phi Multiplier");
        Widgets.createDrag(document.getElementById("group-juliabulb"), (value) => {gpu.uniforms.custom_c = value;}, () => gpu.uniforms.custom_c, "Theta Multiplier");

        Widgets.createSlider(document.getElementById("group-lens"), (value) => {gpu.uniforms.focus_strength = value;}, () => gpu.uniforms.focus_strength, "Blur strength", 0.0, 0.1).addTooltip("How blurred the image is when closer or further than the focus distance");
        Widgets.createSlider(document.getElementById("group-lens"), (value) => {gpu.uniforms.focus_distance = value;}, () => gpu.uniforms.focus_distance, "Focus distance", 0.0, 20.0, true).addTooltip("Sets the focal point, only works when Blur strength is above 0");
        Widgets.createSlider(document.getElementById("group-lens"), (value) => {gpu.uniforms.antialiasing_strength = value;}, () => gpu.uniforms.antialiasing_strength, "Antialiasing strength", 0.0, 0.001).addTooltip("Small ammount of blur applied to the image to remove sharp edges");
        
        Widgets.createComment(document.getElementById("group-sun"), "(Only works for some shading modes)");
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {gpu.sun_rotation.x = value;}, () => gpu.sun_rotation.x, "Sun horizontal rotation", -Infinity, Infinity, 0.1).addTooltip("The horizontal angle of the sun");
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {gpu.sun_rotation.y = value;}, () => gpu.sun_rotation.y, "Sun vertical rotation", -90, 90, 0.1).addTooltip("How high the sun is in the sky");
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {gpu.uniforms.sun_intensity = value;}, () => gpu.uniforms.sun_intensity, "Sun intensity", 0, Infinity, 0.1).addTooltip("Light intensity of the sun, increases noisyness of the image");
        Widgets.createDrag(document.getElementById("group-sun"), (value) => {gpu.uniforms.sky_intensity = value;}, () => gpu.uniforms.sky_intensity, "Sky intensity", 0, Infinity, 0.01).addTooltip("Light intensity of the sky");

        Widgets.createButton(document.getElementById("group-code"), async () => {
            const switch_element = document.querySelector("#group-sdf .switch");
            Widgets.switchSetIndex(switch_element, 0);
            switchAttribute(document.getElementById("group-variables"), 0, undefined, "hidden");

            const code = document.getElementById("input-code").value;
            const message = gpu.recompile(code);
            document.getElementById("output-error").innerText = message;
        }, "Compile");
        storage.markGroup("group-code");
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