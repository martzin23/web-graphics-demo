
export default class WebGLManager {
    static async initialize(canvas) {
        const render_fragment_code = await (await fetch('../scripts/pong/shader/render_fragment.glsl')).text();
        const render_vertex_code = await (await fetch('../scripts/pong/shader/render_vertex.glsl')).text();
        const simulation_fragment_code = await (await fetch('../scripts/pong/shader/simulation_fragment.glsl')).text();
        const simulation_vertex_code = await (await fetch('../scripts/pong/shader/simulation_vertex.glsl')).text();
        return new WebGLManager(canvas, render_fragment_code, render_vertex_code, simulation_fragment_code, simulation_vertex_code);
    }

    constructor(canvas, render_fragment_code, render_vertex_code, simulation_fragment_code, simulation_vertex_code) {
        this.base_render_size = {x: 2560, y: 1440};
        this.canvas = canvas;

        this.vertex_buffer;
        this.vertex_render_location;
        this.vertex_simulation_location;

        this.uniform_buffer;
        this.uniform_render_location;
        this.uniform_simulation_location;

        this.feedback_buffer = [];
        this.color_buffer = [];
        this.frame_buffer = [];

        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl)
            throw new ReferenceError("This device or browser does not support WebGL2.");

        window.addEventListener("resize", () => {this.synchronize();});
        this.canvas.addEventListener("resize", () => {this.synchronize();});

        this.uniforms = {
            canvas_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),
            buffer_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),
        };

        this.simulation_program = makeProgram(this.gl, simulation_fragment_code, simulation_vertex_code);
        this.render_program = makeProgram(this.gl, render_fragment_code, render_vertex_code);

        const uniform_binding_number = 1;
        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.gl.uniformBlockBinding(this.simulation_program, this.gl.getUniformBlockIndex(this.program, "UniformBlock"), uniform_binding_number);
        this.gl.uniformBlockBinding(this.render_program, this.gl.getUniformBlockIndex(this.program, "UniformBlock"), uniform_binding_number);

        this.uniform_buffer = this.gl.createBuffer();
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, uniform_binding_number, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, uniform_array.byteLength, this.gl.STATIC_DRAW);

        // Ping pong buffers

        this.color_buffer[0] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[0]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.base_render_size.x, this.base_render_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.color_buffer[1] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.base_render_size.x, this.base_render_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.frame_buffer[0] = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,  this.frame_buffer[0]);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer[0], 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.frame_buffer[1] = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,  this.frame_buffer[1]);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer[1], 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // Vertex data
        const vertices = new Float32Array([
            1.0, 1.0,
            1.0, -1.0,
            -1.0, -1.0,
            1.0, 1.0,
            -1.0, -1.0,
            -1.0, 1.0
        ]);

        this.vertex_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.vertex_simulation_location = this.gl.getAttribLocation(this.simulation_program, "vertex_position");
        this.vertex_render_location = this.gl.getAttribLocation(this.render_program, "vertex_position");

        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.vertex_simulation_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.vertexAttribPointer(this.vertex_render_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

        this.synchronize();
    }

    render() {
        // update uniform buffer
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, new Float32Array(packUniforms(this.uniforms)), this.gl.DYNAMIC_DRAW);


        // simulation pass
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.canvas_size.x / this.uniforms.render_scale, this.uniforms.canvas_size.y / this.uniforms.render_scale);

        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(this.vertex_location);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);


        // render pass
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.canvas_size.x / this.uniforms.render_scale, this.uniforms.canvas_size.y / this.uniforms.render_scale);

        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(this.vertex_location);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        
        [this.storage_buffer[0], this.storage_buffer[1]] = [this.storage_buffer[1], this.storage_buffer[0]];
        [this.color_buffer[0], this.color_buffer[1]] = [this.color_buffer[1], this.color_buffer[0]];
        [this.frame_buffer[0], this.frame_buffer[1]] = [this.frame_buffer[1], this.frame_buffer[0]];
    }

    synchronize() {
        const width = Math.min(this.canvas.clientWidth, this.base_render_size.x);
        const height = Math.min(this.canvas.clientHeight, this.base_render_size.y);
        this.uniforms.canvas_size = Vector.vec(width, height);
        this.canvas.width = width / this.uniforms.render_scale;
        this.canvas.height = height / this.uniforms.render_scale;
    }
}

function compileShader(gl, shader_code, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, shader_code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error_message = gl.getShaderInfoLog(shader);
        throw new SyntaxError("Error in shader compiling:\n" + error_message);
    }
    return shader;
}

function linkProgram(gl, vertex_shader, fragment_shader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error_message = gl.getProgramInfoLog(program);
        throw new SyntaxError("Error in program linking:\n" + error_message);
    }
    return program;
}

function makeProgram(gl, vertex_shader_code, fragment_shader_code) {
    const vertex_shader = compileShader(gl, vertex_shader_code, gl.VERTEX_SHADER);
    const fragment_shader = compileShader(gl, fragment_shader_code, gl.FRAGMENT_SHADER);
    const program = linkProgram(gl, vertex_shader, fragment_shader);
    return program;
}

function packUniforms(data) {
    let array = [];
    for (const el in data) {
        if (Vector.test(data[el]))
            array.push(Vector.array(data[el]));
        else if (Matrix.test(data[el]))
            array.push(Matrix.array(data[el]));
        else
            array.push(data[el]);
    }
    return array.flat();
}