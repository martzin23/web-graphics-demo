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

Data rayMarch(Ray ray);
float SDF(vec3 p);

vec4 traverse(Ray ray);
vec2 intersectAABB(Ray ray, vec3 p_min, vec3 p_max);
ivec3 pos2index(vec3 position);
bool testVoxel(ivec3 index);

void main() {
    // output_color = texture(height_texture, texture_coordinates);
    // return;

    float aspect_ratio = uniforms.canvas_size.y / uniforms.canvas_size.x;
    vec2 centered_coordinates = (texture_coordinates - 0.5) * 2.0 * vec2(1.0, aspect_ratio);

    
    Ray camera_ray;
    camera_ray.origin = uniforms.camera_position + uniforms.grid_size * vec3(0.5, 0.5, 0.0);
    camera_ray.direction = (uniforms.camera_rotation * vec4(normalize(vec3(centered_coordinates.x * uniforms.fov, 1.0, centered_coordinates.y * uniforms.fov)), 1.0)).xyz;
    camera_ray.inverse = 1.0 / camera_ray.direction;

    // vec3 pixel_color = vec3(0.0);
    // Data camera_data = rayMarch(camera_ray);
    // float factor = 1.0 - (float(camera_data.marches) / 50.0);
    // if (camera_data.collided) {
    //     pixel_color = vec3(factor);
    // } else {
    //     pixel_color = vec3(0.0);
    // }
    // output_color = vec4(1.0 - pixel_color, 1.0);

    // vec3 pixel_color = vec3(0.0);
    // float t = traverse(camera_ray);
    // if (t > 0) {
    //     pixel_color = vec3(t / 100.0);
    // } else {
    //     pixel_color = vec3(0.0);
    // }
    // output_color = vec4(pixel_color, 1.0);


    // float bbox_tmin, bbox_tmax;
    // intersectAABB(camera_ray, vec3(0.0), vec3(uniforms.grid_size), bbox_tmin, bbox_tmax);
    // float value = float(bbox_tmin < bbox_tmax);
    // output_color = vec4(vec3(value), 1.0);

    vec4 r = traverse(camera_ray);
    if (r.w > 0.0) {
        float diffuse = mix(1.0 - uniforms.shading, 1.0, dot(r.xyz, normalize(vec3(1.0, 0.5, 0.75))) * 0.5 + 0.5);
        float height = mix(1.0 - uniforms.fade, 1.0, (camera_ray.origin + camera_ray.direction * r.w).z / (uniforms.grid_size.x * 0.25));
        output_color = vec4(vec3(diffuse * height), 1.0);
    } else {
        output_color = vec4(vec3(0.0), 1.0);
    }
}

Data rayMarch(Ray ray) {
    Data data;
    data.position = ray.origin;
    data.collided = false;
    data.marches = 0;

    int max_marches = 50;
    float epsilon = 0.001;

    for (; data.marches < max_marches; data.marches++) {
        float d = SDF(data.position);
        if (d < epsilon) {
            data.collided = true;
            break;
        }
        data.position += d * ray.direction;
    }

    return data;
}

float SDF(vec3 p) {
    // return length(p) - 1.0;
    float height = texture(height_texture, p.xy * 0.1 + 0.5).x;
    return p.z - height;
}

vec4 traverse(Ray ray) {
    // int max_steps = 3000;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    // float step_size = 1.0;

    // bounding box test
    vec2 bbox_t = intersectAABB(ray, vec3(0.0), vec3(uniforms.grid_size));
    if (bbox_t.x > bbox_t.y) {
        return vec4(normal, -1.0);
    }

    // float t = 0.0;
    // for (int step_count = 0; step_count < max_steps; step_count++) {
    //     if (testVoxel(pos2index(ray.origin + ray.direction * t))) {
    //         return t;
    //     } else if (t > bbox_tmax) {
    //         return -1.0;
    //     } else {
    //         t += destep_sizelta;
    //     }
    // }
    // return -1.0;

    vec3 position = floor(ray.origin + ray.direction * (bbox_t.x + 0.01));
    vec3 march = sign(ray.inverse);
    vec3 delta = (ray.inverse) * march;
    vec3 select = march * 0.5 + 0.5;
    vec3 planes = floor(position) + select;
    vec3 t = (planes - ray.origin) * ray.inverse;

    while (true) {

        // voxel hit
        if (testVoxel(pos2index(position))) {
            return vec4(normal, length(ray.origin - position));
        }

        // ray step
        if (t.x < t.y) {
            if (t.x < t.z) {
                position.x += march.x;
                t.x += delta.x;
                normal = vec3(-march.x, 0.0, 0.0);
            } else {
                position.z += march.z;
                t.z += delta.z;
                normal = vec3(0.0, 0.0, -march.z);
            }
        } else {
            if (t.y < t.z) {
                position.y += march.y;
                t.y += delta.y;
                normal = vec3(0.0, -march.y, 0.0);
            } else {
                position.z += march.z;
                t.z += delta.z;
                normal = vec3(0.0, 0.0, -march.z);
            }
        }

        // exit bounding box
        if (length(ray.origin - position) > bbox_t.y) {
            return vec4(normal, -1.0);
        }
    }
}

vec2 intersectAABB(Ray ray, vec3 p_min, vec3 p_max) {
    vec2 t = vec2(0.0, 1.0 / 0.0);

    for (int i = 0; i < 3; i++) {
        float t1 = (p_min[i] - ray.origin[i]) * ray.inverse[i];
        float t2 = (p_max[i] - ray.origin[i]) * ray.inverse[i];
        t.x = max(t.x, min(t1, t2));
        t.y = min(t.y, max(t1, t2));
    }

    return t;
}

ivec3 pos2index(vec3 position) {
    return ivec3(position);
}

bool testVoxel(ivec3 index) {
    float height = texelFetch(height_texture, index.xy, 0).x;
    // float height = texture(height_texture, vec2(index.xy) / uniforms.grid_size.xy).x;
    return float(index.z) <= (height * uniforms.grid_size.x * 0.25 + 1.0);
}