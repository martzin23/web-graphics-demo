
// https://www.youtube.com/@SebastianLague
fn SDF(p : vec3f) -> f32 {
    let power = uniforms.custom_a;
    var z = p;
    var dr = 1.0;
    var r: f32;
    
    for (var i = 0; i < i32(uniforms.detail); i++) {
        r = length(z);
        if (r > 2) {
            break;
        }

        let theta = acos(z.z / r) * power;
        let phi = atan(z.y / z.x) * power;
        let zr = pow(r, power);
        dr = pow(r, power - 1) * power * dr + 1;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += p;
    }
    return 0.5 * log(r) * r / dr;
}