#version 300 es
precision mediump float;

uniform sampler2D color_buffer;
layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;
    float render_scale;
} uniforms;
in vec2 texture_coordinates;
out vec4 output_color;

vec3 transformColor(vec3 color);

void main() {
    // float aspect_ratio = uniforms.canvas_size.x / uniforms.canvas_size.y;
    vec2 resized_coordinates = texture_coordinates / ((uniforms.buffer_size * uniforms.render_scale) / uniforms.canvas_size);
    // vec2 resized_coordinates = texture_coordinates * vec2(aspect_ratio, 1.0);
    // vec2 resized_coordinates = texture_coordinates * (uniforms.buffer_size / uniforms.canvas_size);
    // vec2 resized_coordinates = texture_coordinates;

    // vec3 pixel_color = vec3(resized_coordinates, 0.0);
    vec3 pixel_color = texture(color_buffer, resized_coordinates).xyz;
    // vec3 pixel_color = texture(color_buffer, texture_coordinates).xyz;
    // if (resized_coordinates.x > 1.0 || resized_coordinates.y > 1.0)
    //     pixel_color = vec3(0.0, 1.0, 1.0);

    // output_color = vec4(pixel_color, 1.0);
    output_color = vec4(transformColor(pixel_color), 1.0);
}

vec3 transformColor(vec3 color) {
    float e = 2.71828;
    float k = 1.0;
    return vec3(1.0 - pow(e,-k*color.x), 1.0 - pow(e,-k*color.y), 1.0 - pow(e,-k*color.z));
}