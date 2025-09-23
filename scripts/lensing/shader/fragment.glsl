#version 300 es
precision highp float;

layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;

    float render_scale;
    float temporal_counter;
    float shader_mode;
    float force_threshold;

    mat4 camera_rotation;
    vec3 camera_position;
    float fov;

    float max_marches;
    float march_size;
    float force_strength;
} uniforms;
struct Ray {
    vec3 origin;
    vec3 direction;
};

uniform sampler2D sky_buffer;
in vec2 texture_coordinates;
out vec4 output_color;

vec3 sampleSky(sampler2D texture, vec3 direction);

void main() {
    vec3 pixel_color = vec3(0.0);
    float aspect_ratio = uniforms.canvas_size.y / uniforms.canvas_size.x;
    vec2 centered_coordinates = (texture_coordinates * 2.0 - 1.0) * vec2(1.0, aspect_ratio);

    Ray ray;
    ray.origin = uniforms.camera_position;
    ray.direction = (uniforms.camera_rotation * vec4(normalize(vec3(centered_coordinates.x * uniforms.fov, 1.0, centered_coordinates.y * uniforms.fov)), 1.0)).xyz;

    vec3 force;
    vec3 position = ray.origin;
    for (int marches; marches < int(uniforms.max_marches); marches++) {
        force = uniforms.force_strength * uniforms.march_size * -normalize(position) / (length(position) * length(position));
        ray.direction = normalize(ray.direction + force);
        position += ray.direction * uniforms.march_size;
    }

    bool collided = length(force) >= uniforms.force_threshold;
    if (collided)
        pixel_color = vec3(0.0);
    else
        pixel_color = sampleSky(sky_buffer, ray.direction);

    output_color = vec4(pixel_color, 1.0);
}

vec3 sampleSky(sampler2D image, vec3 direction) {
    const float pi = 3.14159265359;
    vec3 normalized = normalize(direction);
    float phi = atan(normalized.y, normalized.x);
    float theta = acos(normalized.z);
    float u = (phi + pi) / (2.0 * pi);
    float v = theta / pi;
    return texture(image, vec2(u, v)).rgb;
}