#version 300 es

layout(std140) uniform UniformBlock {
    vec2 buffer_size;
    vec2 canvas_size;
    vec2 grid_size;
    float gap;
    float blend;
    float frame;
};

in vec3 input_position;
in vec3 input_velocity;
out vec3 output_position;
out vec3 output_velocity;

void main() {
    vec3 acceleration = -0.0001 * input_position / pow(length(input_position), 2.0);
    output_velocity = (input_velocity + acceleration) * vec3(1.0, 1.0, 0.0);
    output_position = (input_velocity + input_position) * vec3(1.0, 1.0, 0.0);
}