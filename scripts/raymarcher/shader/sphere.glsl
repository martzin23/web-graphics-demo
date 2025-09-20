float SDF(vec3 p) {
	float radius = uniforms.custom_b;
	return length(p) - radius;
}