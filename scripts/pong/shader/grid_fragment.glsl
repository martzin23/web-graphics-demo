#version 300 es
precision highp float;

layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;
    vec2 grid_size;
    float gap;
};

in vec2 grid_coordinates;
out vec4 output_color;

void main() {
    vec2 normalized_coordinates = vec2(grid_coordinates.x / float(grid_size.x), grid_coordinates.y / float(grid_size.y));
    vec3 pixel_color = vec3(normalized_coordinates, 0.0);

    // output_color = vec4(0.0, 1.0, 0.0, 1.0);
    output_color = vec4(pixel_color, 1.0);
}