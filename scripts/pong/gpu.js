import Vector from "../utility/vector.js";
import Matrix from "../utility/matrix.js";

export default class WebGLManager {
    static async initialize(canvas) {
        const grid_fragment_code = await (await fetch('../scripts/pong/shader/grid_fragment.glsl')).text();
        const grid_vertex_code = await (await fetch('../scripts/pong/shader/grid_vertex.glsl')).text();
        // const simulate_fragment_code = await (await fetch('../scripts/pong/shader/simulate_fragment.glsl')).text();
        // const simulate_vertex_code = await (await fetch('../scripts/pong/shader/simulate_vertex.glsl')).text();
        return new WebGLManager(canvas, grid_fragment_code, grid_vertex_code);
    }

    constructor(canvas, grid_fragment_code, grid_vertex_code) {
        this.base_render_size = {x: 2560, y: 1440};
        this.base_grid_size = {x: 15, y: 30};
        this.canvas = canvas;

        // this.simulate_program;
        // this.trail_program;
        this.grid_program;

        this.vertex_buffer;
        this.vertex_grid_location;
        this.vertex_simulate_location;

        this.uniform_buffer;
        // this.uniform_grid_location;
        // this.uniform_simulate_location;

        // this.feedback_buffer = [];
        // this.color_buffer = [];
        // this.frame_buffer = [];

        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl)
            throw new ReferenceError("This device or browser does not support WebGL2.");

        window.addEventListener("resize", () => {this.synchronize();});
        this.canvas.addEventListener("resize", () => {this.synchronize();});

        this.uniforms = {
            canvas_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),
            buffer_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),
            grid_size: Vector.vec(this.base_grid_size.x, this.base_grid_size.y),
            gap: 0.8,
        };

        // this.simulate_program = makeProgram(this.gl, simulate_fragment_code, simulate_vertex_code);
        this.grid_program = makeProgram(this.gl, grid_vertex_code, grid_fragment_code);

        const uniform_binding_number = 1;
        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.gl.uniformBlockBinding(this.grid_program, this.gl.getUniformBlockIndex(this.grid_program, "UniformBlock"), uniform_binding_number);
        // this.gl.uniformBlockBinding(this.simulate_program, this.gl.getUniformBlockIndex(this.program, "UniformBlock"), uniform_binding_number);

        this.uniform_buffer = this.gl.createBuffer();
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, uniform_binding_number, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, uniform_array.byteLength, this.gl.STATIC_DRAW);

        // Ping pong buffers

        // this.color_buffer[0] = this.gl.createTexture();
        // this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[0]);
        // this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.base_grid_size.x, this.base_grid_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // this.color_buffer[1] = this.gl.createTexture();
        // this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        // this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.base_grid_size.x, this.base_grid_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // this.frame_buffer[0] = this.gl.createFramebuffer();
        // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,  this.frame_buffer[0]);
        // this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer[0], 0);
        // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // this.frame_buffer[1] = this.gl.createFramebuffer();
        // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,  this.frame_buffer[1]);
        // this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer[1], 0);
        // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

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
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        // this.vertex_simulate_location = this.gl.getAttribLocation(this.simulate_program, "vertex_position");
        this.vertex_grid_location = this.gl.getAttribLocation(this.grid_program, "vertex_position");

        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        // this.gl.vertexAttribPointer(this.vertex_simulate_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.vertexAttribPointer(this.vertex_grid_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

        this.synchronize();
    }

    render() {
        // update uniform buffer
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, new Float32Array(packUniforms(this.uniforms)), this.gl.DYNAMIC_DRAW);


        // simulate pass
        // this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        // this.gl.viewport(0, 0, this.uniforms.canvas_size.x / this.uniforms.grid_scale, this.uniforms.canvas_size.y / this.uniforms.grid_scale);

        // this.gl.useProgram(this.program);
        // this.gl.enableVertexAttribArray(this.vertex_location);

        // this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);


        // render pass
        this.gl.clearColor(0.0, 0.0, 0.5, 0.1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.canvas_size.x, this.uniforms.canvas_size.y);

        this.gl.useProgram(this.grid_program);
        this.gl.enableVertexAttribArray(this.vertex_grid_location);

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.uniforms.grid_size.x * this.uniforms.grid_size.y);

        // [this.color_buffer[0], this.color_buffer[1]] = [this.color_buffer[1], this.color_buffer[0]];
        // [this.frame_buffer[0], this.frame_buffer[1]] = [this.frame_buffer[1], this.frame_buffer[0]];
    }

    synchronize() {
        const width = Math.min(this.canvas.clientWidth, this.base_render_size.x);
        const height = Math.min(this.canvas.clientHeight, this.base_render_size.y);
        this.uniforms.canvas_size = Vector.vec(width, height);
        this.canvas.width = width;
        this.canvas.height = height;

        const square_size = 10;
        this.uniforms.grid_size = Vector.vec(Math.floor(width / square_size), Math.floor(height / square_size));
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