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
    float ring_density;

    float ring_radius;
} uniforms;
struct Ray {
    vec3 origin;
    vec3 direction;
};

uniform sampler2D sky_buffer;
in vec2 texture_coordinates;
out vec4 output_color;

vec3 sampleSky(sampler2D texture, vec3 direction);
float sdCappedCylinder(vec3 p, float h, float r);
float diskIntersect(in vec3 ro, in vec3 rd, vec3 c, vec3 n, float r);
float sampleDensity(vec3 p);

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
    for (int marches; marches < int(uniforms.max_marches); marches++) {
        if (uniforms.ring_radius > 0.0) {
            float t = diskIntersect(position, ray.direction, vec3(0.0), vec3(0.0, 0.0, 1.0), uniforms.ring_radius);
            float mask = float(t >= 0.0 && t <= uniforms.march_size);
            density += sampleDensity(position + ray.direction * t) * mask;

            // float d = length(position * vec3(1.0, 1.0, 100.0)) + 100.0;
            // float d = sdCappedCylinder(position, 0.0, uniforms.ring_radius);
            // float m = max(-d + 0.5, 0.0);
            // density += sampleDensity(position) * m;
        }

        force = uniforms.force_strength * uniforms.march_size * -normalize(position) / (length(position) * length(position));
        ray.direction = normalize(ray.direction + force);
        position += ray.direction * uniforms.march_size;
    }

    bool collided = length(force) >= uniforms.force_threshold;
    if (collided)
        pixel_color = vec3(0.0);
    else {
        pixel_color = sampleSky(sky_buffer, ray.direction);
    }

    pixel_color += vec3(1.0, 0.5, 0.3) * density * uniforms.march_size * uniforms.ring_density;
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

// https://iquilezles.org/articles/distfunctions/
float sdCappedCylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xy),p.z)) - vec2(r,h);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sampleDensity(vec3 p) {
    float amplitudes[] = float[](0.01, 0.03, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01);
    float periods[] = float[](6.43, 2.14, 12.4, 5.21, 6.32, 10.2, 43.2, 76.3);

    float density = 0.0;
    for (int i = 0; i < periods.length(); i++)
        density += (sin(length(p) * periods[i]) + 0.25) * amplitudes[i]; 
    float r = clamp(length(p) - uniforms.force_strength * 2.0, 0.0, 1.0);
    return max(density, 0.0) * r;
}

// https://iquilezles.org/articles/intersectors/
float diskIntersect(in vec3 ro, in vec3 rd, vec3 c, vec3 n, float r) {
    vec3  o = ro - c;
    float t = -dot(n,o)/dot(rd,n);
    vec3  q = o + rd*t;
    return (dot(q,q)<r*r) ? t : -1.0;
}