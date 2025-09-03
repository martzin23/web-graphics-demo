import RayMarcher from './engine/raymarcher.js'

const ray_marcher = await RayMarcher.initialize();
let animation_id = requestAnimationFrame(animate);

async function animate() {
    if (!ray_marcher.running) {
        cancelAnimationFrame(animation_id);
        return;
    }

    await ray_marcher.update();
    ray_marcher.render();
    animation_id = requestAnimationFrame(animate);
}
