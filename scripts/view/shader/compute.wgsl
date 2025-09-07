struct UniformBuffer {
    canvas_size : vec2f,
    render_scale : f32,
    temporal_counter : f32,
    camera_rotation : mat4x4f,
    camera_position : vec3f,
    fov: f32,
    sun_direction : vec3f,
    padding : f32
}

@group(0) @binding(0) var color_buffer : texture_storage_2d<rgba32float, write>;
@group(0) @binding(1) var<uniform> uniforms : UniformBuffer;

@compute @workgroup_size(8,8,1)
fn computeMain(@builtin(global_invocation_id) GlobalInvocationID: vec3u) {
    let screen_size = vec2u(uniforms.canvas_size);
    let screen_pos = vec2u(u32(GlobalInvocationID.x), u32(GlobalInvocationID.y));
    if (screen_pos.x > screen_size.x || screen_pos.y > screen_size.y) {
        return;
    }

    let uv = vec2f(GlobalInvocationID.xy) / vec2f(screen_size) * uniforms.render_scale;
    let origin = uniforms.camera_position;
    let direction = (uniforms.camera_rotation * vec4f(normalize(vec3f((uv.x * 2.0 - 1.0) * uniforms.fov, 1.0, -(uv.y * 2.0 - 1.0) * (f32(screen_size.y) / f32(screen_size.x)) * uniforms.fov)),1.0)).xyz;
    let position = rayMarch(origin, direction);
    let normal = normalize(position);
    let diffuse = dot(normal, normalize(uniforms.sun_direction));

    var pixel_color: vec3f = vec3f(diffuse);
    textureStore(color_buffer, screen_pos, vec4f(pixel_color, 1.0));
}

fn rayMarch(org : vec3f, dir : vec3f) -> vec3f {
    let max_marches = 100;
    let epsilon = 0.0001;
    var curr = org;
    for (var march = 0; march < max_marches; march++) {
        let dist = SDF(curr);
        if (dist < epsilon) {
            break;
        }
        else {
            curr += dist * dir;
        }
    }

    return curr;
}

fn SDF(pos : vec3f) -> f32 {
    return length(pos) - 0.5;
}