#version 300 es
precision highp float;

layout(std140) uniform UniformBlock {
    vec2 buffer_size;
    vec2 canvas_size;
    vec2 grid_size;
    float gap;
    float blend;
};

uniform sampler2D color_buffer;
in vec2 grid_coordinates;
out vec4 output_color;

void main() {
    vec2 normalized_coordinates = vec2(grid_coordinates.x / float(grid_size.x), grid_coordinates.y / float(grid_size.y));
    float pixel_value = texelFetch(color_buffer, ivec2(grid_coordinates), 0).x;
    output_color = vec4(vec3(pixel_value), 1.0) * 0.2;
}