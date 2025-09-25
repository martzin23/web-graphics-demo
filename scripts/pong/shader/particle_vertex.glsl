#version 300 es

layout(std140) uniform UniformBlock {
    vec2 buffer_size;
    vec2 canvas_size;
    vec2 grid_size;
    float gap;
    float blend;
    float frame;
};

struct Particle {
    vec3 position;
    vec3 velocity;
};

// layout(std140) buffer ParticleBlock {
//     Particle particles[];
// };

uniform sampler2D particle_buffer;
in vec2 vertex_position;

void main() {
    vec3 position = vec3(frame * 0.01 - 1.0, 0.5 * sin(frame * 0.1), 0.0);
    vec3 final_position = vec3(vertex_position / grid_size, 0.0);
    gl_Position = vec4(final_position + position, 1.0);
}