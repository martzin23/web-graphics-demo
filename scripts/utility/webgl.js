
export function compileShader(gl, shader_code, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, shader_code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error_message = gl.getShaderInfoLog(shader);
        throw new SyntaxError("Error in shader compiling:\n" + error_message);
    }
    return shader;
}

export function linkProgram(gl, vertex_shader, fragment_shader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error_message = gl.getProgramInfoLog(program);
        throw new Error("Error in program linking:\n" + error_message);
    }
    return program;
}

export function createProgram(gl, vertex_shader_code, fragment_shader_code) {
    const vertex_shader = compileShader(gl, vertex_shader_code, gl.VERTEX_SHADER);
    const fragment_shader = compileShader(gl, fragment_shader_code, gl.FRAGMENT_SHADER);
    const program = linkProgram(gl, vertex_shader, fragment_shader);
    return program;
}

export function setFeedbaclVaryings(gl, program, varyings, mode = "SEPARATE_ATTRIBS") {
    gl.transformFeedbackVaryings(program, varyings, gl[mode]);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error_message = gl.getProgramInfoLog(program);
        throw new Error("Error in program linking:\n" + error_message);
    }
}

export function createTexture(gl, width, height, format = "RGBA8", channels = "RGBA", type = "UNSIGNED_BYTE", mag_filter = "LINEAR", warp_mode = "WRAP", data = null) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[format], width, height, 0, gl[channels], gl[type], data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[mag_filter]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[warp_mode]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[warp_mode]);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}