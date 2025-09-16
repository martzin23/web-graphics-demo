
// http://blog.hvidtfeldts.net/index.php/2011/11/distance-estimated-3d-fractals-vi-the-mandelbox/
float SDF(vec3 p) {
    float scale = uniforms.custom_a;
    float folding_limit = uniforms.custom_b;
    float min_radius = uniforms.custom_c;
    float fixed_radius = uniforms.custom_d;
    float folding_value = uniforms.custom_e;
    vec3 z = p;
    float dr = 1.0;

    for (int n = 0; n < int(uniforms.detail) + 2; n++) {
        z = clamp(z, -vec3(folding_limit), vec3(folding_limit)) * folding_value - z;

        float r2 = dot(z,z);
        if (r2 < min_radius) { 
            float temp = fixed_radius / min_radius;
            z *= temp;
            dr *= temp;
        } else if (r2 < fixed_radius) { 
            float temp = fixed_radius / r2;
            z *= temp;
            dr *= temp;
        }
        z = scale * z + p;  
        dr = dr * abs(scale) + 1.0;
    }
    float r = length(z);
    return r / abs(dr);
}