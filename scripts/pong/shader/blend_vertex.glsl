#version 300 es

layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;
    vec2 grid_size;
    float gap;
    float blend;
};

in vec2 vertex_position;
out vec2 grid_coordinates;
out vec2 texture_coordinates;

void main() {
    texture_coordinates = vertex_position * 0.5 + 0.5;
    grid_coordinates = vec2(texture_coordinates * grid_size);
    gl_Position = vec4(vertex_position, 0.0, 1.0);
}