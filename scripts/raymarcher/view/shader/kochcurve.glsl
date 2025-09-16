
// https://github.com/Angramme/fractal_viewer/blob/master/fractals/koch_curve.glsl
float SDF(vec3 p) {

    float pi = 3.14 * uniforms.custom_a;
    mat2 rot60deg = mat2(cos(pi/3.0), -sin(pi/3.0), sin(pi/3.0), cos(pi/3.0));
    mat2 rotm60deg = mat2(cos(pi/3.0), sin(pi/3.0), -sin(pi/3.0), cos(pi/3.0));

    float s2 = 1.0;
    for(int i = 0; i < int(uniforms.detail); i++){
        const float x1 = 2.0/3.0;
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
    const float x2 = 1.15470053839;
    float d = abs(p.y) + x2 * p.x - x2;
    const float x1 = 1.0 / sqrt(1.0 + x2 * x2);
    d *= x1;
    return d * s2;



    // float pi = 3.14 * uniforms.custom_a;
    // mat2 rot60deg = mat2(cos(pi/3), -sin(pi/3), sin(pi/3), cos(pi/3));
    // mat2 rotm60deg = mat2(cos(pi/3), sin(pi/3), -sin(pi/3), cos(pi/3));
    // float s2 = 1.0;
    // vec3 z = p;

    // for(int i = 0; i < int(uniforms.detail); i++){
    //     float x1 = 2.0/3.0;
    //     s2 *= x1;
    //     z /= x1;
    //     if(abs(z.z) > -z.x * 1.73205081){
    //         z.x *= -1.0;
    //         if (z.z > 0.0) {
    //             let temp = rotm60deg * z.xz;
    //             z.x = temp.x;
    //             z.z = temp.y;
    //         } else {
    //             let temp = rot60deg * z.xz;
    //             z.x = temp.x;
    //             z.z = temp.y;
    //         }
    //     }
    //     let temp = z.z;
    //     z.z = z.y;
    //     z.y = temp;
    //     z.x += 1.0 * uniforms.custom_b;
    // }

    // if(abs(z.z) > z.x * 1.73205081){
    //     z.x *= -1.0;
    //     if (z.z > 0.0) {
    //             let temp = rot60deg * z.xz;
    //             z.x = temp.x;
    //             z.z = temp.y;
    //     } else {
    //             let temp = rotm60deg * z.xz;
    //             z.x = temp.x;
    //             z.z = temp.y;
    //     }
    // }

    // let x2 = 1.15470053839;
    // let x1 = 1.0 / sqrt( 1.0 + x2 * x2);
    // var d = abs(z.y) + x2 * z.x - x2;
    // d *= x1;
    // return d * s2;
}