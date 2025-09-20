fn SDF(p : vec3f) -> f32 {
    return length(p) - uniforms.custom_a;
}