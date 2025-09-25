#version 300 es

layout(std140) uniform UniformBlock {
    vec2 buffer_size;
    vec2 canvas_size;
    vec2 grid_size;
    float gap;
    float blend;
};

in vec3 input_position;
in vec3 input_velocity;
out vec3 output_position;
out vec3 output_velocity;

void main() {
    output_velocity = input_velocity;
    output_position = output_velocity + input_position;
}