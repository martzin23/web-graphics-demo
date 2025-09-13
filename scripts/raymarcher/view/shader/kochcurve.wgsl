
// https://github.com/Angramme/fractal_viewer/blob/master/fractals/koch_curve.glsl
fn SDF(p : vec3f) -> f32 {
    let pi = 3.14 * uniforms.custom_a;
    let rot60deg = mat2x2f(cos(pi/3), -sin(pi/3), sin(pi/3), cos(pi/3));
    let rotm60deg = mat2x2f(cos(pi/3), sin(pi/3), -sin(pi/3), cos(pi/3));
    var s2 = 1.0;
    var z = p;

    for(var i = 0; i < i32(uniforms.detail); i++){
        let x1 = 2.0/3.0;
        s2 *= x1;
        z /= x1;
        if(abs(z.z) > -z.x * 1.73205081){
            z.x *= -1.0;
            if (z.z > 0.0) {
                let temp = rotm60deg * z.xz;
                z.x = temp.x;
                z.z = temp.y;
            } else {
                let temp = rot60deg * z.xz;
                z.x = temp.x;
                z.z = temp.y;
            }
        }
        let temp = z.z;
        z.z = z.y;
        z.y = temp;
        z.x += 1.0 * uniforms.custom_b;
    }

    if(abs(z.z) > z.x * 1.73205081){
        z.x *= -1.0;
        if (z.z > 0.0) {
                let temp = rot60deg * z.xz;
                z.x = temp.x;
                z.z = temp.y;
        } else {
                let temp = rotm60deg * z.xz;
                z.x = temp.x;
                z.z = temp.y;
        }
    }

    let x2 = 1.15470053839;
    let x1 = 1.0 / sqrt( 1.0 + x2 * x2);
    var d = abs(z.y) + x2 * z.x - x2;
    d *= x1;
    return d * s2;
}