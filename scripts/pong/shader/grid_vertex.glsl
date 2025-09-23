#version 300 es

layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;
    vec2 grid_size;
    float gap;
};

in vec2 vertex_position;
out vec2 grid_coordinates;

void main() {
    vec2 size_factor = 1.0 / grid_size;
    vec2 normalized_coordinates = vertex_position * 0.5 * gap - 0.5;

    grid_coordinates = vec2(float(gl_InstanceID % int(grid_size.x)), float(gl_InstanceID / int(grid_size.x)));
    gl_Position = vec4(((normalized_coordinates + grid_coordinates + 1.0) * size_factor - 0.5) * 2.0, 0.0, 1.0);
}