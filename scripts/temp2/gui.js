import * as Loader from '../utility/loader.js'
import * as Tile from './tile.js';

export default class GUIManager {
    constructor(canvas, gpu, camera) {
        this.canvas = canvas;
        this.setupListeners(gpu, camera);
    }

    setupListeners(gpu, camera) {
        canvas.addEventListener("click", () => {
            camera.toggle(this.canvas);
        });

        document.addEventListener("keypress", (event) => {
            if (event.key == " ")
                camera.orbit_mode = !camera.orbit_mode;
        });

        document.getElementById("input-fetch").addEventListener("click", async () => {
            const z = document.getElementById("input-z").value;
            const x = document.getElementById("input-x").value;
            const y = document.getElementById("input-y").value;
            const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
            const element_error = document.getElementById("output-error");

            try {
                const image = await Loader.loadImage(url);
                gpu.reloadImage(image);
                element_error.innerText = "";
                gpu.uniforms.height_multiplier = (parseFloat(z) + 1.0) * 0.5;
            } catch (error) {
                console.log(error);
                element_error.innerText = "Invalid coordinates: X and Y should be lower or equal than (2^Z - 1)!";
            }
        });

        document.getElementById("map").addEventListener('pointerdown', (event_start) => {
            const element_rect = document.getElementById("rect");
            const element_map = document.getElementById("map");
            const map_rect = element_map.getBoundingClientRect();

            const setRect = function setRect(element, start_x, start_y, end_x, end_y) {
                if (end_x < start_x)
                    [start_x, end_x] = [end_x, start_x];
                if (end_y < start_y)
                    [start_y, end_y] = [end_y, start_y];

                element.style.left = start_x + "px";
                element.style.top = start_y + "px";
                element.style.width = (end_x - start_x) + "px";
                element.style.height = (end_y - start_y) + "px";
            }

            element_rect.style.display = "block";
            let start_x = event_start.x - map_rect.x;
            let start_y = event_start.y - map_rect.y
            let end_x = start_x;
            let end_y = start_y;
            setRect(element_rect, start_x, start_y, end_x, end_y);
            console.log("start");

            const callback_move = (event_move) => {
                if (Math.abs(end_x - start_x) > 100 || Math.abs(end_y - start_y) > 100)
                    element_rect.classList.add("invalid");
                else
                    element_rect.classList.remove("invalid");

                end_x = event_move.x - map_rect.x;
                end_y = event_move.y - map_rect.y;
                setRect(element_rect, start_x, start_y, end_x, end_y);

                // const normalized_x = map_x / map_rect.width;
                // const normalized_y = map_y / map_rect.height;
            };
            const callback_submit = async function() {
                element_map.removeEventListener("pointermove", callback_move);
                element_map.removeEventListener("pointerup", callback_submit);
                element_map.removeEventListener("pointercancel", callback_submit);
                element_map.removeEventListener("pointerleave", callback_submit);
                
                if (end_x < start_x)
                    [start_x, end_x] = [end_x, start_x];
                if (end_y < start_y)
                    [start_y, end_y] = [end_y, start_y];

                const lat = ((start_x / map_rect.width) * 2.0 - 1.0) * 180;
                const long = ((start_y / map_rect.height) * 2.0 - 1.0) * 180;
                console.log(lat, long)
                const image = Tile.formatTile(await Tile.fetchTile(lat, long));
                console.log(image)
                gpu.reloadImage(image);

                // const data = Tile.getData(start_x, start_y, end_x, end_y);
                // gpu.reloadImage(data.image);

                console.log("end");
            };

            element_map.addEventListener("pointermove", callback_move);
            element_map.addEventListener("pointerup", callback_submit);
            element_map.addEventListener("pointercancel", callback_submit);
            element_map.addEventListener("pointerleave", callback_submit);
        });
    }
}

