#version 300 es
in vec2 vertex_position;
out vec2 texture_coordinates;

void main() {
    texture_coordinates = vertex_position * 0.5 + 0.5;
    gl_Position = vec4(vertex_position, 0.0, 1.0);
}