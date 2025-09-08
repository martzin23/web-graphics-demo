struct UniformBuffer {
    canvas_size: vec2f,
    buffer_size: vec2f,
    render_scale: f32
}
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texture_coordinate: vec2f
};
struct BufferData {
    colors: array<vec4<f32>>
};

@group(0) @binding(0) var<storage, read_write> color_buffer: BufferData;
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
    let pixel_coordinate = vec2u(texture_coordinate * uniforms.canvas_size / uniforms.render_scale);
    let index = pixel_coordinate.x + pixel_coordinate.y * u32(uniforms.buffer_size.y);
    let pixel_color = color_buffer.colors[index].xyz;
    return vec4f(transformColor(pixel_color), 1.0);
}

fn transformColor(color: vec3f) -> vec3f {
    const e = 2.71828;
    const k = 1.0;
    return vec3f(1 - pow(e,-k*color.x), 1 - pow(e,-k*color.y), 1 - pow(e,-k*color.z));
}