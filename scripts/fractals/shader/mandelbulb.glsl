
// https://www.youtube.com/@SebastianLague
float SDF(vec3 p) {
    float power = uniforms.custom_a;
    vec3 z = p;
    float dr = 1.0;
    float r;
    
    for (int i = 0; i < int(uniforms.detail); i++) {
        r = length(z);
        if (r > 2.0) {
            break;
        }
        float theta = acos(z.z / r) * power;
        float phi = atan(z.y / z.x) * power;
        float zr = pow(r, power);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += p;
    }
    return 0.5 * log(r) * r / dr;
}