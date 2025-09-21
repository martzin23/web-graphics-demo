
// https://github.com/Angramme/fractal_viewer/blob/master/fractals/koch_curve.glsl
float SDF(vec3 p) {
    float pi = 3.14;
    mat2 rot60deg = mat2(cos(pi/3.0), -sin(pi/3.0), sin(pi/3.0), cos(pi/3.0));
    mat2 rotm60deg = mat2(cos(pi/3.0), sin(pi/3.0), -sin(pi/3.0), cos(pi/3.0));

    float s2 = 1.0;
    for(int i = 0; i < int(uniforms.detail); i++){
        float x1 = 2.0/3.0 * uniforms.custom_a;
        s2 *= x1;
        p /= x1;
        if(abs(p.z) > -p.x * 1.73205081){
            p.x *= -1.0;
            p.xz = (p.z > 0.0 ? rotm60deg : rot60deg) * p.xz;
        }
        p.zy = p.yz;
        p.x += 1.0 * uniforms.custom_b;
    }

    if(abs(p.z) > p.x * 1.73205081){
        p.x *= -1.0;
        p.xz = (p.z > 0.0 ? rot60deg : rotm60deg) * p.xz;
    }
    float x2 = uniforms.custom_c * 1.15470053839;
    float d = abs(p.y) + x2 * p.x - x2;
    float x1 = 1.0 / sqrt(1.0 + x2 * x2);
    d *= x1;
    return d * s2;
}