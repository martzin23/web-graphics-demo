#version 300 es

layout(std140) uniform UniformBlock {
    vec2 buffer_size;
    vec2 canvas_size;
    vec2 grid_size;
    float gap;
    float blend;
    float frame;
};

// struct Particle {
//     vec3 position;
//     vec3 velocity;
// };

// layout(std140) uniform ParticleBlock {
//     Particle particles[1];
// };

// uniform sampler2D particle_buffer;
// in vec2 vertex_position;
in vec3 input_position;
in vec3 input_velocity;

void main() {
    vec3 aspect_ratio = vec3(grid_size.y / grid_size.x, 1.0, 1.0);
    gl_PointSize = 1.0;
    gl_Position = vec4(input_position * aspect_ratio, 1.0);
}