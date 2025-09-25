#version 300 es
precision highp float;

layout(std140) uniform UniformBlock {
    vec2 buffer_size;
    vec2 canvas_size;
    vec2 grid_size;
    float gap;
    float blend;
    float frame;
};

out vec4 output_color;

void main() {
    output_color = vec4(1.0, 1.0, 1.0, 1.0);
}