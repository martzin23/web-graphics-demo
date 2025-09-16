#version 300 es
precision mediump float;

layout(std140) uniform UniformBlock {
    vec2 canvas_size;
    vec2 buffer_size;

    float render_scale;
    float temporal_counter;
    float focus_distance;
    float focus_strength;
    
    mat4 camera_rotation;
    vec3 camera_position;
    float fov;

    vec3 sun_direction;
    float shader_mode;

    float max_bounces;
    float max_marches;
    float epsilon;
    float normals_precision;

    float detail;
    float sun_intensity;
    float sky_intensity;
    float custom_a;

    float custom_b;
    float custom_c;
    float custom_d;
    float custom_e;
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

vec3 pathTrace(Ray camera_ray, inout uint seed);
Data rayMarch(Ray ray);
void focusBlur(Ray ray, inout uint seed, const float dist, const float strength);
vec3 derivateNormal(vec3 position, float epsilon);
vec3 skyValue(vec3 direction);
float randomUniform(inout uint seed);
float randomNormal(inout uint seed);
vec3 randomDirection(inout uint seed);
float SDF(vec3 p);

void main() {
    // float aspect_ratio = uniforms.buffer_size.x / uniforms.buffer_size.y;
    float aspect_ratio = uniforms.canvas_size.y / uniforms.canvas_size.x;
    // vec2 size_ratio =  uniforms.canvas_size / (uniforms.render_scale * uniforms.buffer_size);

    // vec2 centered_coordinates = texture_coordinates;
    // vec2 centered_coordinates = (texture_coordinates) * vec2(1.0, aspect_ratio) - vec2(uniforms.canvas_size * 0.5 / uniforms.buffer_size);
    vec2 centered_coordinates = (texture_coordinates - 0.5) * 2.0 * vec2(1.0, aspect_ratio);
    // vec2 centered_coordinates = (texture_coordinates - 0.25) * (uniforms.buffer_size / uniforms.canvas_size);
    // vec2 centered_coordinates = (((texture_coordinates * vec2(aspect_ratio, 1.0) - 1.0 / size_ratio) * size_ratio) - 0.0) * 1.0;
    // vec2 centered_coordinates = (texture_coordinates - size_ratio) * 2.0 * vec2(aspect_ratio, 1.0);
    // vec2 centered_coordinates = (texture_coordinates - ((uniforms.canvas_size * 0.25 / uniforms.buffer_size))) * 5.0 * vec2(1.0, 0.8);
    // vec2 centered_coordinates = (texture_coordinates - 0.125 * vec2(1.0, aspect_ratio)) / (size_ratio * 0.5);

    // output_color = vec4(centered_coordinates, 0.0, 1.0);
    // output_color = vec4(vec3(sin(centered_coordinates.x * 100.0) + sin(centered_coordinates.y * 100.0)), 1.0);
    // if (length(centered_coordinates) < 0.38)
    //     output_color = vec4(1.0, 0.0, 1.0, 1.0);
    // const float temp = 1.0;
    // if (abs(centered_coordinates.x) > temp || abs(centered_coordinates.y) > temp)
    //     output_color = vec4(1.0, 0.0, 1.0, 1.0);
        

    uvec2 integer_coordinates = uvec2(texture_coordinates * uniforms.canvas_size);
    uint seed = integer_coordinates.x + integer_coordinates.y * uint(uniforms.canvas_size.x) + uint(uniforms.temporal_counter) * uint(69420);

    Ray camera_ray;
    camera_ray.origin = uniforms.camera_position;
    camera_ray.direction = (uniforms.camera_rotation * vec4(normalize(vec3(centered_coordinates.x * uniforms.fov, 1.0, -centered_coordinates.y * uniforms.fov)), 1.0)).xyz;
    camera_ray.direction = normalize(camera_ray.direction + randomDirection(seed) * 0.0005 * uniforms.fov * uniforms.render_scale);
    focusBlur(camera_ray, seed, uniforms.focus_distance, uniforms.focus_strength);

    vec4 previous_color = vec4(0.0);
    vec3 pixel_color = vec3(0.0);
    if (uniforms.shader_mode == 1.0) {
        Data data = rayMarch(camera_ray);
        float factor = 1.0 - (float(data.marches) / uniforms.max_marches);
        if (data.collided) {
            pixel_color = vec3(((data.normal * 2.0 + 1.0) * 0.5 + 0.5) * factor);
        } else {
            pixel_color = vec3(0.0);
        }
        output_color = vec4(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 1.0);
    } else if (uniforms.shader_mode == 2.0) {
        Data camera_data = rayMarch(camera_ray);
        float diffuse = clamp(dot(camera_data.normal, uniforms.sun_direction), 0.0, 1.0);
        float specular = clamp(pow(dot(camera_data.normal, uniforms.sun_direction), 50.0), 0.0, 1.0);

        Ray shadow_ray;
        shadow_ray.direction = uniforms.sun_direction;
        shadow_ray.origin = camera_data.position + camera_data.normal * uniforms.epsilon;

        Data shadow_data = rayMarch(shadow_ray);
        float shadow = float(shadow_data.dist > 100.0);

        if (camera_data.collided) {
            pixel_color = vec3((diffuse + specular) * shadow);
        } else {
            pixel_color = vec3(0.0);
        }
        output_color = vec4(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 1.0);
    } else if (uniforms.shader_mode == 3.0) {
        pixel_color = pathTrace(camera_ray, seed);
        output_color = vec4(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 1.0);
    } else {
        Data data = rayMarch(camera_ray);
        float factor = 1.0 - (float(data.marches) / uniforms.max_marches);
        pixel_color = vec3(mix(0.0, factor, float(data.collided)));
        output_color = vec4(previous_color.xyz * ((uniforms.temporal_counter - 1.0) / uniforms.temporal_counter) + pixel_color * (1.0 / uniforms.temporal_counter), 1.0);
    }
}

vec3 pathTrace(Ray camera_ray, inout uint seed) {
    Ray ray = camera_ray;
    vec3 sample_color = vec3(0.0);
    vec3 ray_color = vec3(1.0);

    for (int bounce_counter = 0; bounce_counter < int(uniforms.max_bounces); bounce_counter++) {
        Data data = rayMarch(ray);

        if (!data.collided) {
            if (data.dist > 10.0 || bounce_counter == 0) {
                vec3 sky = skyValue(ray.direction);
                sample_color += sky * ray_color;
            }
            else {
                sample_color += 0.0 * ray_color;
            }
            break;
        }
        
        ray.direction = normalize(randomDirection(seed) + data.normal);
        ray.origin = data.position + ray.direction * uniforms.epsilon;
        
        vec3 color = vec3(1.0);
        // vec3 color = -data.normal * 0.25 + 0.75;
        vec3 emission = vec3(0.0);
        sample_color += emission * color * ray_color;
        ray_color *= color;
    }

    return sample_color;
}

Data rayMarch(Ray ray) {
    Data data;
    data.position = ray.origin;
    data.collided = false;
    data.marches = 0;

    for (; data.marches < int(uniforms.max_marches); data.marches++) {
        float d = SDF(data.position);
        if (d < pow(2.0, -uniforms.detail)) {
            data.collided = true;
            break;
        }
        data.position += d * ray.direction;
    }

    data.normal = derivateNormal(data.position, uniforms.normals_precision);
    data.dist = length(data.position - ray.origin); 
    return data;
}

vec3 derivateNormal(vec3 position, float epsilon) {
    vec3 normal;
	normal.x = (SDF(position + vec3(epsilon, 0.0, 0.0)) - SDF(position - vec3(epsilon, 0.0, 0.0)));
	normal.y = (SDF(position + vec3(0.0, epsilon, 0.0)) - SDF(position - vec3(0.0, epsilon, 0.0)));
	normal.z = (SDF(position + vec3(0.0, 0.0, epsilon)) - SDF(position - vec3(0.0, 0.0, epsilon)));
    return normalize(normal  / (2.0 * epsilon));
}

float randomUniform(inout uint seed) {
    // https://www.youtube.com/@SebastianLague
    seed *= (seed + uint(195439)) * (seed + uint(124395)) * (seed + uint(845921));
    return float(seed) / 4294967295.0;
}

float randomNormal(inout uint seed) {
    // https://stackoverflow.com/a/6178290
    float theta = 2.0 * 3.1415926 * randomUniform(seed);
    float rho = sqrt(-2.0 * log(randomUniform(seed)));
    return rho * cos(theta);
}

vec3 randomDirection(inout uint seed) {
    return normalize(vec3(randomNormal(seed), randomNormal(seed), randomNormal(seed)));
}

void focusBlur(Ray ray, inout uint seed, const float range, const float strength) {
    vec3 focus_point = ray.origin + ray.direction * range;
    ray.origin += randomDirection(seed) * strength;
    ray.direction = normalize(focus_point - ray.origin);
}

vec3 skyValue(vec3 direction) {
    const vec3 sun_color = vec3(1.0, 1.0, 0.8);
    float sun_intensity = uniforms.sun_intensity;

    const vec3 horizon_color = vec3(1.8, 1.8, 2.0);
    const vec3 zenith_color = vec3(0.2, 0.2, 0.8);
    const vec3 ground_color = vec3(0.1);
    float sky_intensity = uniforms.sky_intensity;

    float altitude = dot(direction, vec3(0.0, 0.0, 1.0));
    float day_factor = dot(vec3(0.0, 0.0, 1.0), uniforms.sun_direction) * 0.5 + 0.5;
    float sun_factor = pow(dot(direction, uniforms.sun_direction) * 0.5 + 0.5, 100.0 + (1.0 - day_factor) * 1000.0);

    vec3 day_color = mix(horizon_color, zenith_color, pow(clamp(abs(altitude), 0.0, 1.0), 0.5)) * sky_intensity;
    vec3 night_color = day_color * vec3(0.1, 0.1, 0.3);
    vec3 sun_value = sun_factor * sun_color * sun_intensity;

    return mix(night_color, day_color, day_factor) + sun_value * day_factor;
}