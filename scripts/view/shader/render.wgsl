struct UniformBuffer {
    canvas_size : vec2f,
    render_scale : f32
}
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texture_coordinate: vec2f
};

@group(0) @binding(0) var color_buffer: texture_2d<f32>;
@group(0) @binding(1) var<uniform> uniforms : UniformBuffer;


@vertex
fn vertexMain(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {

    let positions = array<vec2f, 6>(
        vec2f(1.0, 1.0),
        vec2f(1.0, -1.0),
        vec2f(-1.0, -1.0),
        vec2f(1.0, 1.0),
        vec2f(-1.0, -1.0),
        vec2f(-1.0, 1.0)
    );

    let texture_coordinates = array<vec2f, 6>(
        vec2f(1.0, 0.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 1.0),
        vec2f(1.0, 0.0),
        vec2f(0.0, 1.0),
        vec2f(0.0, 0.0)
    );

    var output : VertexOutput;
    output.position = vec4f(positions[VertexIndex], 0.0, 1.0);
    output.texture_coordinate = texture_coordinates[VertexIndex];
    return output;
}

@fragment
    fn fragmentMain(@location(0) texture_coordinate: vec2f) -> @location(0) vec4f {
    let texture_size = vec2f(textureDimensions(color_buffer));
    let screen_coordinate = texture_coordinate * (uniforms.canvas_size / texture_size) / uniforms.render_scale;
    let pixel_color = textureLoad(color_buffer, vec2u(screen_coordinate * texture_size), 0).xyz;
    return vec4f(transformColor(pixel_color), 1.0);
    // return vec4f(pixel_color, 1.0);
}

fn transformColor(color: vec3f) -> vec3f {
    const e = 2.71828;
    const k = 1.0;
    return vec3f(1 - pow(e,-k*color.x), 1 - pow(e,-k*color.y), 1 - pow(e,-k*color.z));
}