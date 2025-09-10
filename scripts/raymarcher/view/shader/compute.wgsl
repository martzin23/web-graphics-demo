struct UniformBuffer {
    canvas_size: vec2f,
    buffer_size: vec2f,

    render_scale: f32,
    temporal_counter: f32,
    focus_distance: f32,
    focus_strength: f32,
    
    camera_rotation: mat4x4f,
    camera_position: vec3f,
    fov: f32,

    sun_direction: vec3f,
    shader_mode: f32,

    max_bounces: f32,
    max_marches: f32,
    epsilon: f32,
    detail: f32,

    custom_a: f32,
    custom_b: f32,
    custom_c: f32,
    custom_d: f32
}
struct BufferData {
    colors: array<vec4<f32>>
};
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

var<private> state: u32;
@group(0) @binding(0) var<storage, read_write> color_buffer: BufferData;
@group(0) @binding(1) var<uniform> uniforms : UniformBuffer;

@compute @workgroup_size(16,16,1)
// @compute @workgroup_size(256,1,1)
fn computeMain(@builtin(global_invocation_id) GlobalInvocationID: vec3u) {

    // Getting coordinates
    let index = GlobalInvocationID.x + GlobalInvocationID.y * u32(uniforms.buffer_size.x);
    let aspect_ratio = uniforms.canvas_size.y / uniforms.canvas_size.x;
    let screen_normalized = vec2f(GlobalInvocationID.xy) / uniforms.canvas_size * uniforms.render_scale;
    state = index + u32(uniforms.temporal_counter) * 69420;

    // Camera ray
    var camera_ray: Ray;
    camera_ray.origin = uniforms.camera_position;
    camera_ray.direction = (uniforms.camera_rotation * vec4f(normalize(vec3f((screen_normalized.x * 2.0 - 1.0) * uniforms.fov, 1.0, -(screen_normalized.y * 2.0 - 1.0) * aspect_ratio * uniforms.fov)),1.0)).xyz;
    camera_ray.direction = normalize(camera_ray.direction + randomDirection() * 0.0005 * uniforms.fov * uniforms.render_scale);
    camera_ray = focusBlur(camera_ray, uniforms.focus_distance, uniforms.focus_strength);

    // Shading
    var previous_color = color_buffer.colors[index];
    var output_color: vec4f;
    var pixel_color: vec3f;
    switch (u32(uniforms.shader_mode)) {
        default {
            let data: Data = rayMarch(camera_ray);
            let factor = 1 - (f32(data.marches) / uniforms.max_marches);
            pixel_color = vec3f(mix(0.0, factor, f32(data.collided)));
            output_color = vec4f(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 1.0);
        }
        case (1) {
            let data: Data = rayMarch(camera_ray);
            // let diffuse = dot(, normalize(uniforms.sun_direction));
            let factor = 1 - (f32(data.marches) / uniforms.max_marches);
            if (data.collided) {
                pixel_color = vec3f(((data.normal * 2.0 + 1.0) * 0.5 + 0.5) * factor);
            } else {
                pixel_color = vec3f(0.0);
            }
            output_color = vec4f(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 1.0);
        }
        case (2) {
            pixel_color = pathTrace(camera_ray);
            output_color = vec4f(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 1.0);
        }
        case (3) {
            if (uniforms.temporal_counter != 1) {
                camera_ray.origin = camera_ray.origin + camera_ray.direction * previous_color.w;

                if (SDF(camera_ray.origin) < pow(2, -uniforms.detail)) {
                    let normal = derivateNormal(camera_ray.origin, uniforms.epsilon);
                    let diffuse = clamp(dot(normal, uniforms.sun_direction), 0.0, 1.0);

                    // var shadow_ray: Ray;
                    // shadow_ray.direction = normalize(uniforms.sun_direction);
                    // shadow_ray.origin = camera_ray.origin + shadow_ray.direction * 2 * pow(2, -uniforms.detail);
                    // let shadow_data = rayMarch2(shadow_ray);
                    // let shadow = f32(!shadow_data.collided);
                    
                    let pixel_color = vec3f(diffuse * clamp(mix(1.0, 0.0, previous_color.w / 2), 0.0, 1.0));
                    // let pixel_color = vec3f(diffuse * shadow);
                    // if (previous_color.x == 0) {
                    //     output_color = vec4f(pixel_color, 0.0);
                    // } else {
                    //     output_color = vec4f(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 0);
                    // }
                    output_color = vec4f(0.99 * previous_color.xyz + 0.01 * pixel_color, 0.0);

                } else if (previous_color.w > 100) {
                    output_color = vec4f(0.0, 0.0, 0.0, 100);
                } else {
                    let camera_data: Data = rayMarch(camera_ray);
                    let dist = length(camera_data.position - uniforms.camera_position);
                    output_color = vec4f(previous_color.xyz, dist);
                }
            } else {
                output_color = vec4f(0.0);
            }
        }
    }
    
    color_buffer.colors[index] = output_color;
}

fn pathTrace(camera_ray: Ray) -> vec3f {
    var ray = camera_ray;
    var sample_color = vec3f(0.0);
    var ray_color = vec3f(1.0);

    for (var bounce_counter = 0; bounce_counter < i32(uniforms.max_bounces); bounce_counter++) {
        let data = rayMarch(ray);

        if (!data.collided) {
            if (data.dist > 10 || bounce_counter == 0) {
                let sky = skyValue(ray.direction);
                sample_color += sky * ray_color;
            }
            else {
                sample_color += 0 * ray_color;
            }
            break;
        }
        
        ray.direction = normalize(randomDirection() + data.normal);
        ray.origin = data.position + ray.direction * uniforms.epsilon;
        
        let color = vec3(1.0);
        // vec3 color = -data.normal * 0.25 + 0.75;
        let emission = vec3(0.0);
        sample_color += emission * color * ray_color;
        ray_color *= color;
    }

    return sample_color;
}

fn rayMarch(ray: Ray) -> Data {
    var data: Data;
    data.position = ray.origin;
    data.collided = false;
    data.marches = 0;

    for (; data.marches < i32(uniforms.max_marches); data.marches++) {
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

fn focusBlur(ray: Ray, range: f32, strength: f32) -> Ray {
    let focus_point = ray.origin + ray.direction * range;
    var result: Ray;
    result.origin = ray.origin + randomDirection() * strength;
    result.direction = normalize(focus_point - result.origin);
    return result;
}

fn derivateNormal(position: vec3f, epsilon: f32) -> vec3f {
    var normal: vec3f;
	normal.x = (SDF(position + vec3f(epsilon, 0.0, 0.0)) - SDF(position - vec3f(epsilon, 0.0, 0.0)));
	normal.y = (SDF(position + vec3f(0.0, epsilon, 0.0)) - SDF(position - vec3f(0.0, epsilon, 0.0)));
	normal.z = (SDF(position + vec3f(0.0, 0.0, epsilon)) - SDF(position - vec3f(0.0, 0.0, epsilon)));
    return normalize(normal  / (2 * epsilon));
}

fn skyValue(direction: vec3f) -> vec3f {
    const sun_color = vec3f(1.0, 1.0, 0.8);
    const sun_intensity = 100.0;

    const horizon_color = vec3f(1.8, 1.8, 2.0);
    const zenith_color = vec3f(0.2, 0.2, 0.8);
    const ground_color = vec3f(0.1);
    const sky_intensity = 0.5;

    let altitude = dot(direction, vec3f(0.0, 0.0, 1.0));
    let day_factor = dot(vec3f(0.0, 0.0, 1.0), normalize(uniforms.sun_direction)) * 0.5 + 0.5;
    let sun_factor = pow(dot(direction,  normalize(uniforms.sun_direction)) * 0.5 + 0.5, 100.0 + (1 - day_factor) * 1000.0);

    let day_color = mix(horizon_color, zenith_color, pow(clamp(abs(altitude), 0.0, 1.0), 0.5)) * sky_intensity;
    let night_color = day_color * vec3f(0.1, 0.1, 0.3);
    let sun_value = sun_factor * sun_color * sun_intensity;

    return mix(night_color, day_color, day_factor) + sun_value * day_factor;
}

fn randomUniform() -> f32 {
    // https://www.youtube.com/@SebastianLague
    state *= (state + 195439) * (state + 124395) * (state + 845921);
    return f32(state) / f32(0xffffffff);
}

fn randomNormal() -> f32 {
    // https://stackoverflow.com/a/6178290
    let theta = 2 * 3.1415926 * randomUniform();
    let rho = sqrt(-2 * log(randomUniform()));
    return rho * cos(theta);
}

fn randomDirection() -> vec3f {
    return normalize(vec3(randomNormal(), randomNormal(), randomNormal()));
}

// fn SDF(p : vec3f) -> f32 {
//     return length(p) - 0.5;
// }

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