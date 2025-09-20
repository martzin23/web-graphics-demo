import Vector from "./vector.js";

export function addTouchListener(element, callback) {
    let previous_a = Vector.vec(0.0);
    let previous_b = Vector.vec(0.0);
    let previous_distance;

    element.addEventListener("touchstart", (event) => {
        if (event.touches.length == 1) {
            const touch_a = event.touches.item(0);
            previous_a = Vector.vec(touch_a.clientX, touch_a.clientY, 0.0);
        } else {
            const touch_b = event.touches.item(1);
            previous_b = Vector.vec(touch_b.clientX, touch_b.clientY, 0.0);
            previous_distance = Vector.len(Vector.sub(previous_a, previous_b));
        }
    });

    element.addEventListener("touchmove", (event) => {
        const touch_a = event.touches.item(0);
        let delta = Vector.sub(Vector.vec(touch_a.clientX, touch_a.clientY, 0.0), previous_a);
        previous_a = Vector.vec(touch_a.clientX, touch_a.clientY, 0.0);

        if (event.touches.length > 1) {
            const touch_b = event.touches.item(1);
            previous_b = Vector.vec(touch_b.clientX, touch_b.clientY, 0.0);
            const distance = Vector.len(Vector.sub(previous_a, previous_b));
            delta = Vector.vec(0.0, 0.0, distance - previous_distance);
            previous_distance = distance;
        }

        callback({
            deltaX: delta.x * 2.0,
            deltaY: delta.y * 2.0,
            deltaZ: delta.z
        });
    });
}