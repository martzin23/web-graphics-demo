#version 300 es

layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;
    vec2 grid_size;
    float gap;
    float blend;
    float frame;
};

in vec2 vertex_position;

void main() {
    vec2 offset = vec2(frame * 0.001 - 0.5, 0.0);
    gl_Position = vec4(vertex_position * 0.3 + offset, 0.0, 1.0);
}