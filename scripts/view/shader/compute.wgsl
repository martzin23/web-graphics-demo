struct UniformBuffer {
    canvas_size: vec2f,
    render_scale: f32,
    temporal_counter: f32,
    camera_rotation: mat4x4f,
    camera_position: vec3f,
    fov: f32,
    sun_direction: vec3f,
    shader_mode: f32,
    max_bounces: f32,
    max_marches: f32,
    epsilon: f32,
    detail: f32,
    focus_distance: f32,
    focus_strength: f32,
    custom_a: f32,
    custom_b: f32,
    custom_c: f32,
    custom_d: f32,
    custom_e: f32,
    custom_f: f32
}
struct Ray {
    origin: vec3f,
    direction: vec3f
}
struct Data {
    position: vec3f,
    collided: bool,
    normal: vec3f,
    dist: f32,
    marches: i32
}


@group(0) @binding(0) var color_buffer : texture_storage_2d<rgba32float, write>;
@group(0) @binding(1) var<uniform> uniforms : UniformBuffer;

@compute @workgroup_size(8,8,1)
fn computeMain(@builtin(global_invocation_id) GlobalInvocationID: vec3u) {

    // Getting coordinates
    let screen_size = vec2u(uniforms.canvas_size);
    let screen_position = vec2u(u32(GlobalInvocationID.x), u32(GlobalInvocationID.y));
    if (screen_position.x > screen_size.x || screen_position.y > screen_size.y) { return; }
    let screen_normalized = vec2f(GlobalInvocationID.xy) / vec2f(screen_size) * uniforms.render_scale;

    // Camera ray
    var camera_ray: Ray;
    camera_ray.origin = uniforms.camera_position;
    camera_ray.direction = (uniforms.camera_rotation * vec4f(normalize(vec3f((screen_normalized.x * 2.0 - 1.0) * uniforms.fov, 1.0, -(screen_normalized.y * 2.0 - 1.0) * (f32(screen_size.y) / f32(screen_size.x)) * uniforms.fov)),1.0)).xyz;

    // Shading
    var pixel_color: vec3f;
    switch (u32(uniforms.shader_mode)) {
        default {
            let data: Data = rayMarch(camera_ray);
            let factor = 1 - (f32(data.marches) / uniforms.max_marches);
            if (data.collided) {
                pixel_color = vec3f(factor);
            } else {
                pixel_color = vec3f(0.0);
            }
        }
        case (1) {
            let data: Data = rayMarch(camera_ray);
            let diffuse = dot(data.normal, normalize(uniforms.sun_direction));
            // let diffuse = 1 - (data.marches / uniforms.max_marches);
            if (data.collided) {
                pixel_color = vec3f(diffuse);
            } else {
                pixel_color = vec3f(0.0);
            }
        }
    }

    textureStore(color_buffer, screen_position, vec4f(pixel_color, 1.0));
}

// fn pathTrace()

fn rayMarch(ray: Ray) -> Data {
    var data: Data;
    data.position = ray.origin;
    data.collided = false;

    for (data.marches = 0; data.marches < i32(uniforms.max_marches); data.marches++) {
        let d = SDF(data.position);
        if (d < pow(2, -uniforms.detail)) {
            data.collided = true;
            break;
        }
        data.position += d * ray.direction;
    }

    data.normal = derivateNormal(data.position, uniforms.epsilon);
    data.dist = length(data.position - ray.origin); 
    return data;
}

fn derivateNormal(position: vec3f, epsilon: f32) -> vec3f {
    var normal: vec3f;
	normal.x = (SDF(position + vec3f(epsilon, 0.0, 0.0)) - SDF(position - vec3f(epsilon, 0.0, 0.0))) / (2 * epsilon);
	normal.y = (SDF(position + vec3f(0.0, epsilon, 0.0)) - SDF(position - vec3f(0.0, epsilon, 0.0))) / (2 * epsilon);
	normal.z = (SDF(position + vec3f(0.0, 0.0, epsilon)) - SDF(position - vec3f(0.0, 0.0, epsilon))) / (2 * epsilon);
    return normalize(normal);
}

fn skyValue(direction: vec3f) -> vec3f {
    const sun_color = vec3f(1.0, 1.0, 0.8);
    const sun_intensity = 100.0;

    const horizon_color = vec3f(1.8, 1.8, 2.0);
    const zenith_color = vec3f(0.2, 0.2, 0.8);
    const ground_color = vec3f(0.1);
    const sky_intensity = 0.5;

    let altitude = dot(direction, vec3f(0.0, 0.0, 1.0));
    let day_factor = dot(vec3f(0.0, 0.0, 1.0), uniforms.sun_direction) * 0.5 + 0.5;
    let sun_factor = pow(dot(direction, uniforms.sun_direction) * 0.5 + 0.5, 100.0 + (1 - day_factor) * 1000.0);

    let day_color = mix(horizon_color, zenith_color, pow(clamp(abs(altitude), 0.0, 1.0), 0.5)) * sky_intensity;
    let night_color = day_color * vec3f(0.1, 0.1, 0.3);
    let sun_value = sun_factor * sun_color * sun_intensity;

    return mix(night_color, day_color, day_factor) + sun_value * day_factor;
}

fn SDF(p : vec3f) -> f32 {
    return length(p) - 0.5;
}

// fn SDF(p : vec3f) -> f32 {
//     // const scale = custom_float2;
//     // const folding_limit = custom_float3;
//     // const min_radius2 = custom_float4;
//     // const fixed_radius2 = custom_float1;
//     let scale = uniforms.custom_a;
//     let folding_limit = uniforms.custom_b;
//     let min_radius2 = uniforms.custom_c;
//     let fixed_radius2 = uniforms.custom_d;

//     var z = p;
//     var dr = 1.0;
//     for (var n = 0; n < i32(uniforms.detail) + 2; n++) {
//         z = clamp(z, -vec3f(folding_limit), vec3f(folding_limit)) * 2.0 - z;

//         let r2 = dot(z,z);
//         if (r2 < min_radius2) { 
//             let temp = fixed_radius2 / min_radius2;
//             z *= temp;
//             dr *= temp;
//         } else if (r2 < fixed_radius2) { 
//             let temp = fixed_radius2 / r2;
//             z *= temp;
//             dr *= temp;
//         }
//         z = scale * z + p;  
//         dr = dr * abs(scale) + 1.0;
//     }
//     let r = length(z);
//     return r / abs(dr);
// }