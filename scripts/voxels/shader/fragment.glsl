#version 300 es
precision highp float;

layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;

    vec3 grid_size;
    float render_scale;

    mat4 camera_rotation;
    vec3 camera_position;
    float fov;

    float fade;
    float shading;
    float normals;
    float mode;

    float height_offset;
    float height_multiplier;
    float height_gamma;
    float sampling_scale;
} uniforms;

struct Ray {
    vec3 origin;
    vec3 direction;
    vec3 inverse;
};
struct Data {
    vec3 position;
    bool collided;
    int marches;
};

uniform sampler2D height_texture;
in vec2 texture_coordinates;
out vec4 output_color;

vec4 traverse(Ray ray);
vec2 intersect(Ray ray, vec3 p_min, vec3 p_max);
vec3 getNormal(vec3 position, float epsilon);
float getHeight(vec3 position);

void main() {
    float aspect_ratio = uniforms.canvas_size.y / uniforms.canvas_size.x;
    vec2 centered_coordinates = (texture_coordinates - 0.5) * 2.0 * vec2(1.0, aspect_ratio);
    
    Ray camera_ray;
    camera_ray.origin = uniforms.camera_position + uniforms.grid_size * vec3(0.5, 0.5, 0.0) * uniforms.sampling_scale;
    camera_ray.direction = (uniforms.camera_rotation * vec4(normalize(vec3(centered_coordinates.x * uniforms.fov, 1.0, centered_coordinates.y * uniforms.fov)), 1.0)).xyz;
    camera_ray.inverse = 1.0 / camera_ray.direction;

    vec4 r = traverse(camera_ray);
    if (r.w > 0.0) {
        // vec3 position = camera_ray.origin + camera_ray.direction * r.w;
        // output_color = vec4(floor(position) * 0.1, 1.0);
        // return;

        if (uniforms.mode == 0.0) {
            vec3 normal = getNormal(camera_ray.origin + camera_ray.direction * r.w, uniforms.normals) * 0.5 + 0.5;
            float diffuse = mix(1.0, abs(dot(r.xyz, normalize(vec3(1.0, 0.5, 0.75)))), uniforms.shading);
            float height = mix(1.0, ((camera_ray.origin + camera_ray.direction * r.w).z) / (uniforms.grid_size.z * uniforms.height_multiplier * uniforms.sampling_scale), uniforms.fade);
            output_color = vec4(vec3(diffuse * height) * ((uniforms.normals > 0.0) ? normal : vec3(1.0)), 1.0);
        } else {
            float height = mix(0.5, 1.0, (camera_ray.origin + camera_ray.direction * r.w).z / (uniforms.grid_size.x * uniforms.height_multiplier * 0.15));
            vec3 normal = getNormal(camera_ray.origin + camera_ray.direction * r.w, uniforms.normals);
            float diffuse = dot(normalize(normal), normalize(vec3(1.0, 0.5, 0.75))) * 0.5 + 0.5;
            output_color = vec4(vec3(diffuse * height), 1.0);
        }
    } else {
        output_color = vec4(0.0);
    }
}

vec4 traverse(Ray ray) {
    vec3 normal = vec3(0.0, 0.0, 1.0);

    vec2 bbox_t = intersect(ray, vec3(0.0), uniforms.grid_size * uniforms.sampling_scale);
    if (bbox_t.x > bbox_t.y) {
        return vec4(normal, -1.0);
    }

    vec3 position = floor(ray.origin + ray.direction * (bbox_t.x + 0.01));
    vec3 march = sign(ray.inverse);
    vec3 delta = (ray.inverse) * march;
    vec3 select = march * 0.5 + 0.5;
    vec3 planes = position + select;
    vec3 limit = floor(uniforms.grid_size * uniforms.sampling_scale);
    vec3 t = (planes - ray.origin) * ray.inverse;

    while (true) {
        if (position.z <= getHeight(position)) {
            return vec4(normal, length(ray.origin - position));
        }

        if (t.x < t.y) {
            if (t.x < t.z) {
                position.x += march.x;
                if (position.x > limit.x || position.x < 0.0)
                    return vec4(normal, -1.0);
                t.x += delta.x;
                normal = vec3(-march.x, 0.0, 0.0);
            } else {
                position.z += march.z;
                if (position.z > limit.z || position.z < 0.0)
                    return vec4(normal, -1.0);
                t.z += delta.z;
                normal = vec3(0.0, 0.0, -march.z);
            }
        } else {
            if (t.y < t.z) {
                position.y += march.y;
                if (position.y > limit.y || position.y < 0.0)
                    return vec4(normal, -1.0);
                t.y += delta.y;
                normal = vec3(0.0, -march.y, 0.0);
            } else {
                position.z += march.z;
                if (position.z > limit.z || position.z < 0.0)
                    return vec4(normal, -1.0);
                t.z += delta.z;
                normal = vec3(0.0, 0.0, -march.z);
            }
        }
    }
}

vec2 intersect(Ray ray, vec3 p_min, vec3 p_max) {
    vec2 t = vec2(0.0, 1.0 / 0.0);

    for (int i = 0; i < 3; i++) {
        float t1 = (p_min[i] - ray.origin[i]) * ray.inverse[i];
        float t2 = (p_max[i] - ray.origin[i]) * ray.inverse[i];
        t.x = max(t.x, min(t1, t2));
        t.y = min(t.y, max(t1, t2));
    }

    return t;
}

float getHeight(vec3 position) {
    vec4 data = texture(height_texture, (vec2(1.0, 0.0) - position.xy / (uniforms.grid_size.xy * uniforms.sampling_scale)) * vec2(1.0, -1.0));
    // vec4 data = texelFetch(height_texture, ivec2(position).xy, 0);
    float height = (data.r * 256.0 + data.g + data.b / 256.0);
    return (height + uniforms.height_offset) * uniforms.height_multiplier * uniforms.sampling_scale;
}

vec3 getNormal(vec3 position, float epsilon) {
    vec3 normal;
	normal.x = getHeight(position + vec3(epsilon, 0.0, 0.0)) - getHeight(position - vec3(epsilon, 0.0, 0.0));
	normal.y = getHeight(position + vec3(0.0, epsilon, 0.0)) - getHeight(position - vec3(0.0, epsilon, 0.0));
	normal.z = 2.0 * epsilon;
    return normalize(normal / vec3(2.0 * epsilon));
}

// vec3 getNormal(vec3 position, float epsilon) {
//     vec3 normal;
// 	normal.x = getHeight(floor(position + vec3(epsilon, 0.0, 0.0))) - getHeight(floor(position - vec3(epsilon, 0.0, 0.0)));
// 	normal.y = getHeight(floor(position + vec3(0.0, epsilon, 0.0))) - getHeight(floor(position - vec3(0.0, epsilon, 0.0)));
// 	normal.z = 2.0 * epsilon;
//     return normalize(normal / vec3(2.0 * epsilon));
// }

// vec3 getNormal(vec3 position, float epsilon) {
//     vec2 temp_position = position.xy / uniforms.grid_size.xy;
//     float temp_epsilon = epsilon / uniforms.grid_size.x;
//     vec3 normal;
// 	normal.x = (texture(height_texture, temp_position + vec2(temp_epsilon, 0.0)).x - texture(height_texture, temp_position - vec2(temp_epsilon, 0.0)).x);
// 	normal.y = (texture(height_texture, temp_position + vec2(0.0, temp_epsilon)).x - texture(height_texture, temp_position - vec2(0.0, temp_epsilon)).x);
// 	normal.z = 2.0 * temp_epsilon;
//     return normalize(normal / vec3(2.0 * temp_epsilon));
// }

// vec3 getNormal(vec3 position, float epsilon) {
//     vec3 normal;
// 	normal.x = texture(height_texture, floor(position.xy + vec2(epsilon, 0.0)) / uniforms.grid_size.xy).x - texture(height_texture, floor(position.xy - vec2(epsilon, 0.0)) / uniforms.grid_size.xy).x;
// 	normal.y = texture(height_texture, floor(position.xy + vec2(0.0, epsilon)) / uniforms.grid_size.xy).x - texture(height_texture, floor(position.xy - vec2(0.0, epsilon)) / uniforms.grid_size.xy).x;
// 	normal.z = epsilon / uniforms.grid_size.z;
//     return normalize(normal / (2.0 * epsilon));
// }