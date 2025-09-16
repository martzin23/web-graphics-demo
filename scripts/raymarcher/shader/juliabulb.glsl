
// https://github.com/adamsol/FractalView/blob/master/src/renderers/fractal/juliabulb.glsl
float SDF(vec3 p) {
    float exponent = uniforms.custom_a;
    vec3 z = p;
    vec3 d = vec3(1.0);
    float r = 0.0;
    float b = 10000.0;

    for (int i = 0; i < int(uniforms.detail); i++) {
        d = exponent * pow(r, exponent-1.0) * d + 1.0;
        if (r > 0.0) {
            float phi = atan(z.z / z.x);
            phi *= exponent;
            float theta = acos(z.y / r);
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