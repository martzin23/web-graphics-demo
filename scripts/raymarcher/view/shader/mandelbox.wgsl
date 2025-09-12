
// http://blog.hvidtfeldts.net/index.php/2011/11/distance-estimated-3d-fractals-vi-the-mandelbox/
fn SDF(p : vec3f) -> f32 {
    let scale = uniforms.custom_a;
    let folding_limit = uniforms.custom_b;
    let min_radius = uniforms.custom_c;
    let fixed_radius = uniforms.custom_d;
    let folding_value = uniforms.custom_e;
    var z = p;
    var dr = 1.0;

    for (var n = 0; n < i32(uniforms.detail) + 2; n++) {
        z = clamp(z, -vec3f(folding_limit), vec3f(folding_limit)) * folding_value - z;

        let r2 = dot(z,z);
        if (r2 < min_radius) { 
            let temp = fixed_radius / min_radius;
            z *= temp;
            dr *= temp;
        } else if (r2 < fixed_radius) { 
            let temp = fixed_radius / r2;
            z *= temp;
            dr *= temp;
        }
        z = scale * z + p;  
        dr = dr * abs(scale) + 1.0;
    }
    let r = length(z);
    return r / abs(dr);
}