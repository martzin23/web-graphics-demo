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
    output_velocity = input_velocity + acceleration;
    // output_velocity = input_velocity;
    output_position = input_velocity + input_position;
    // if (length(output_position) > 1.0) {
    //     output_position = vec3(0.5, 0.5, 0.0);
    // }
    
    // float speed = 0.03;
    // float radius = 0.3 + 0.3 * float(gl_VertexID);
    // output_position = vec3(radius * cos(frame * speed), radius * sin(frame * speed), 0.0);
}