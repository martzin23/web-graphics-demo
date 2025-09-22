#version 300 es
precision highp float;

uniform sampler2D sky_buffer;
layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;

    float render_scale;
    float temporal_counter;
    float shader_mode;
    float epsilon;

    mat4 camera_rotation;
    vec3 camera_position;
    float fov;

    float max_marches;
    float march_size;
    float force_strength;
    float padding_a;
} uniforms;
struct Ray {
    vec3 origin;
    vec3 direction;
};
struct Data {
    vec3 position;
    bool collided;
    vec3 normal;
    float dist;
    int marches;
};
in vec2 texture_coordinates;
out vec4 output_color;

vec3 transformColor(vec3 color);
Data rayMarch(Ray ray);
Data rayMarch2(inout Ray ray);
vec3 mapSky(sampler2D texture, vec3 direction);
vec2 dir2uv(vec3 direction);

void main() {
    vec3 pixel_color = vec3(0.0);
    float aspect_ratio = uniforms.canvas_size.y / uniforms.canvas_size.x;
    vec2 centered_coordinates = (texture_coordinates * 2.0 - 1.0) * vec2(1.0, aspect_ratio);

    Ray camera_ray;
    camera_ray.origin = uniforms.camera_position;
    camera_ray.direction = (uniforms.camera_rotation * vec4(normalize(vec3(centered_coordinates.x * uniforms.fov, 1.0, centered_coordinates.y * uniforms.fov)), 1.0)).xyz;

    Data camera_data = rayMarch2(camera_ray);
    // float diffuse = clamp(dot(camera_data.normal, vec3(1.0, 1.0, 1.0)), 0.0, 1.0);
    if (camera_data.collided) {
        // pixel_color = vec3(diffuse);
        pixel_color = vec3(0.0);
    } else {
        // pixel_color = vec3(0.0);
        pixel_color = mapSky(sky_buffer, camera_ray.direction);
    }

    // pixel_color = (texture(sky_buffer, texture_coordinates)).xyz;
    output_color = vec4(transformColor(pixel_color), 1.0);
}

vec3 transformColor(vec3 color) {
    float e = 2.71828;
    float k = 1.0;
    return vec3(1.0 - pow(e,-k*color.x), 1.0 - pow(e,-k*color.y), 1.0 - pow(e,-k*color.z));
}

Data rayMarch2(inout Ray ray) {
    Data data;
    data.position = ray.origin;
    data.collided = false;
    data.marches = 0;

    for (; data.marches < int(uniforms.max_marches); data.marches++) {
        if (length(data.position) < uniforms.epsilon) {
            data.collided = true;
            break;
        }
        vec3 force = uniforms.force_strength * -normalize(data.position) / (length(data.position) * length(data.position));
        // if (length(force) > uniforms.epsilon) {
        //     data.collided = true;
        //     break;
        // }
        ray.direction = normalize(ray.direction + force);
        // if (dot(ray.direction, normalize(data.position)) > 1.0 - uniforms.epsilon) {
        //     data.collided = true;
        //     break;
        // }
        data.position += ray.direction * uniforms.march_size;
    }

    data.normal = normalize(data.position);
    data.dist = length(data.position - ray.origin); 
    return data;
}

Data rayMarch(Ray ray) {
    Data data;
    data.position = ray.origin;
    data.collided = false;
    data.marches = 0;

    float max_marches = 100.0;
    float epsilon = 0.001;

    for (; data.marches < int(max_marches); data.marches++) {
        float d = length(data.position) - 1.0;
        if (d < epsilon) {
            data.collided = true;
            break;
        }
        data.position += d * ray.direction;
    }

    data.normal = normalize(data.position);
    data.dist = length(data.position - ray.origin); 
    return data;
}

vec3 mapSky(sampler2D image, vec3 direction) {
    vec2 uv = dir2uv(direction);
    return texture(image, uv).rgb;
}

vec2 dir2uv(vec3 direction) {
    const float pi = 3.14159265359;
    vec3 normalized = normalize(direction);
    float phi = atan(normalized.y, normalized.x);
    float theta = acos(normalized.z);
    float u = (phi + pi) / (2.0 * pi);
    float v = theta / pi;
    return vec2(u, v);
}