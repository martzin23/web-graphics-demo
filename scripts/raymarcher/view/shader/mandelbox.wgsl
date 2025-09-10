fn SDF(p : vec3f) -> f32 {
    let scale = uniforms.custom_a;
    let folding_limit = uniforms.custom_b;
    let min_radius2 = uniforms.custom_c;
    let fixed_radius2 = uniforms.custom_d;

    var z = p;
    var dr = 1.0;
    for (var n = 0; n < i32(uniforms.detail) + 2; n++) {
        z = clamp(z, -vec3f(folding_limit), vec3f(folding_limit)) * 2.0 - z;

        let r2 = dot(z,z);
        if (r2 < min_radius2) { 
            let temp = fixed_radius2 / min_radius2;
            z *= temp;
            dr *= temp;
        } else if (r2 < fixed_radius2) { 
            let temp = fixed_radius2 / r2;
            z *= temp;
            dr *= temp;
        }
        z = scale * z + p;  
        dr = dr * abs(scale) + 1.0;
    }
    let r = length(z);
    return r / abs(dr);
}