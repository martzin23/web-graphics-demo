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
    float disc_enabled;

    float disc_radius;
} uniforms;
struct Ray {
    vec3 origin;
    vec3 direction;
};

uniform sampler2D sky_texture;
uniform sampler2D disc_texture;
in vec2 texture_coordinates;
out vec4 output_color;

vec3 sampleSky(sampler2D texture, vec3 direction);
float diskIntersect(in vec3 ro, in vec3 rd, vec3 c, vec3 n, float r);

void main() {
    vec3 pixel_color = vec3(0.0);
    float aspect_ratio = uniforms.canvas_size.y / uniforms.canvas_size.x;
    vec2 centered_coordinates = (texture_coordinates * 2.0 - 1.0) * vec2(1.0, aspect_ratio);

    Ray ray;
    ray.origin = uniforms.camera_position;
    ray.direction = (uniforms.camera_rotation * vec4(normalize(vec3(centered_coordinates.x * uniforms.fov, 1.0, centered_coordinates.y * uniforms.fov)), 1.0)).xyz;

    float density = 0.0;
    vec3 force;
    vec3 position = ray.origin;
    vec3 disc_color = vec3(0.0);
    for (int marches; marches < int(uniforms.max_marches); marches++) {
        force = uniforms.force_strength * uniforms.march_size * -normalize(position) / (length(position) * length(position));
        ray.direction = normalize(ray.direction + force);

        if (uniforms.disc_enabled > 0.0) {
            float t = diskIntersect(position, ray.direction, vec3(0.0), vec3(0.0, 0.0, 1.0), uniforms.disc_radius);
            if (t >= 0.0 && t <= uniforms.march_size && !(length(force) >= uniforms.force_threshold)) {
                vec3 temp = position + ray.direction * t;
                vec2 uv = (temp.xy / (uniforms.disc_radius) + 1.0) * 0.5;
                disc_color += texture(disc_texture, uv).rgb;
            }
        }

        position += ray.direction * uniforms.march_size;
    }

    bool horizon_collision = length(force) >= uniforms.force_threshold;
    if (horizon_collision)
        pixel_color = vec3(0.0);
    else
        pixel_color = sampleSky(sky_texture, ray.direction);

    pixel_color += disc_color;
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

// https://iquilezles.org/articles/intersectors/
float diskIntersect(in vec3 ro, in vec3 rd, vec3 c, vec3 n, float r) {
    vec3  o = ro - c;
    float t = -dot(n,o)/dot(rd,n);
    vec3  q = o + rd*t;
    return (dot(q,q)<r*r) ? t : -1.0;
}