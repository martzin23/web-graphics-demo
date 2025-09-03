struct UniformBuffer {
    canvas_size : vec2f,
    render_scale : f32
}

@group(0) @binding(0) var screen_sampler: sampler;
@group(0) @binding(1) var color_buffer: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms : UniformBuffer;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texture_coordinate: vec2f
};

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
    // return textureSample(color_buffer, screen_sampler, texture_coordinate * vec2f(1.0 / uniforms.aspect_ratio, 1.0 / (texture_size.x / texture_size.y)));
    return textureSample(color_buffer, screen_sampler, texture_coordinate * (uniforms.canvas_size / texture_size) / uniforms.render_scale);
    // return textureSample(color_buffer, screen_sampler, texture_coordinate);
}