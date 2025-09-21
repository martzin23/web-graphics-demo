
// https://github.com/adamsol/FractalView/blob/master/src/renderers/fractal/juliabulb.glsl
fn SDF(p : vec3f) -> f32 {
    let exponent = uniforms.custom_a;
    var z = p;
    var d = vec3(1.0);
    var r = 0.0;
    var b = 10000.0;

    for (var i = 0; i < i32(uniforms.detail); i++) {
        d = exponent * pow(r, exponent-1.0) * d + 1.0;
        if (r > 0.0) {
            var phi = atan(z.z / z.x);
            phi *= exponent;
            var theta = acos(z.y / r);
            theta *= exponent;
            r = pow(r, exponent);
            z = vec3(cos(phi) * cos(theta), sin(theta), sin(phi) * cos(theta)) * r;
        }
        z += vec3(0.3, -0.9, -0.2);
        r = length(z);
        b = min(r, b);
        if (r >= 2.0) {
            break;
        }
    }
    return r * log(r) * 0.5 / length(d);
}