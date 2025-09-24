import Vector from "../utility/vector.js";
import Matrix from "../utility/matrix.js";

class ParticleSimulator {
    static async initialize(canvas) {
        const grid_vertex_code = await (await fetch('../scripts/pong/shader/grid_vertex.glsl')).text();
        const grid_fragment_code = await (await fetch('../scripts/pong/shader/grid_fragment.glsl')).text();
        const particle_vertex_code = await (await fetch('../scripts/pong/shader/particle_vertex.glsl')).text();
        const particle_fragment_code = await (await fetch('../scripts/pong/shader/particle_fragment.glsl')).text();
        const blend_vertex_code = await (await fetch('../scripts/pong/shader/blend_vertex.glsl')).text();
        const blend_fragment_code = await (await fetch('../scripts/pong/shader/blend_fragment.glsl')).text();
        const simulate_vertex_code = await (await fetch('../scripts/pong/shader/blend_vertex.glsl')).text();
        const simulate_fragment_code = await (await fetch('../scripts/pong/shader/blend_fragment.glsl')).text();
        return new ParticleSimulator(canvas, grid_vertex_code, grid_fragment_code, particle_vertex_code, particle_fragment_code, blend_vertex_code, blend_fragment_code, simulate_vertex_code, simulate_fragment_code);
    }

    constructor(canvas, grid_vertex_code, grid_fragment_code, particle_vertex_code, particle_fragment_code, blend_vertex_code, blend_fragment_code, simulate_vertex_code, simulate_fragment_code) {
        this.canvas = canvas;
        this.square_size = 20;
        this.max_render_size = {x: 2560, y: 1440};
        this.max_grid_size = {x: Math.floor(this.max_render_size.y / this.square_size), y: Math.floor(this.max_render_size.y / this.square_size)};
        this.particle_count = 1;
        
        this.uniform_buffer;

        this.vertex_buffer;
        this.vertex_grid_location;
        this.vertex_particle_location;
        this.vertex_blend_location;

        this.color_buffer = [];
        this.grid_color_location;
        this.blend_color_location;

        this.frame_buffer = [];

        this.grid_program;
        this.particle_program;
        this.blend_program;
        this.simulate_program;

        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl)
            throw new ReferenceError("This device or browser does not support WebGL2.");

        window.addEventListener("resize", () => {this.synchronize();});
        this.canvas.addEventListener("resize", () => {this.synchronize();});

        this.uniforms = {
            canvas_size: Vector.vec(this.max_render_size.x, this.max_render_size.y),
            buffer_size: Vector.vec(this.max_render_size.x, this.max_render_size.y),
            grid_size: Vector.vec(this.max_grid_size.x, this.max_grid_size.y),
            gap: 0.9,
            blend: 1 / 510,
            frame: 0,
        };

        this.grid_program = makeProgram(this.gl, grid_vertex_code, grid_fragment_code);
        this.particle_program = makeProgram(this.gl, particle_vertex_code, particle_fragment_code);
        this.blend_program = makeProgram(this.gl, blend_vertex_code, blend_fragment_code);
        this.simulate_program = makeProgram(this.gl, simulate_vertex_code, simulate_fragment_code);

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

        const uniform_binding_number = 0;
        this.uniform_buffer = this.gl.createBuffer();
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, uniform_binding_number, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, (new Float32Array(packUniforms(this.uniforms))).byteLength, this.gl.DYNAMIC_DRAW);
        this.gl.uniformBlockBinding(this.grid_program, this.gl.getUniformBlockIndex(this.grid_program, "UniformBlock"), uniform_binding_number);
        this.gl.uniformBlockBinding(this.particle_program, this.gl.getUniformBlockIndex(this.particle_program, "UniformBlock"), uniform_binding_number);
        this.gl.uniformBlockBinding(this.blend_program, this.gl.getUniformBlockIndex(this.particle_program, "UniformBlock"), uniform_binding_number);


        this.color_buffer[0] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[0]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.max_grid_size.x, this.max_grid_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.color_buffer[1] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.max_grid_size.x, this.max_grid_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
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

        
        this.vertex_grid_location = this.gl.getAttribLocation(this.grid_program, "vertex_position");
        this.vertex_particle_location = this.gl.getAttribLocation(this.particle_program, "vertex_position");
        this.vertex_blend_location = this.gl.getAttribLocation(this.blend_program, "vertex_position");

        this.grid_color_location = this.gl.getUniformLocation(this.grid_program, 'color_buffer');
        this.blend_color_location = this.gl.getUniformLocation(this.particle_program, 'color_buffer');
        

        this.synchronize();
    }

    draw() {
        // update uniform buffer
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, new Float32Array(packUniforms(this.uniforms)), this.gl.DYNAMIC_DRAW);


        // simulation pass

        // // this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // // this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        // this.gl.viewport(0, 0, this.uniforms.grid_size.x, this.uniforms.grid_size.y);

        // this.gl.useProgram(this.particle_program);
        // this.gl.enableVertexAttribArray(this.vertex_particle_location);

        // this.gl.beginTransformFeedback(this.gl.POINTS);
        // this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        // this.gl.endTransformFeedback();


        // blend pass
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frame_buffer[0]);

        // this.gl.clearColor(1.0, 0.0, 0.0, 1.0);
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.grid_size.x, this.uniforms.grid_size.y);

        this.gl.useProgram(this.blend_program);
        this.gl.enableVertexAttribArray(this.vertex_blend_location);
        this.gl.vertexAttribPointer(this.vertex_blend_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        this.gl.uniform1i(this.blend_color_location, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);


        // particle pass
        this.gl.useProgram(this.particle_program);
        this.gl.enableVertexAttribArray(this.vertex_particle_location);
        this.gl.vertexAttribPointer(this.vertex_particle_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.particle_count);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


        // grid pass
        this.gl.clearColor(1.0, 0.0, 0.0, 0.1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.canvas_size.x, this.uniforms.canvas_size.y);

        this.gl.useProgram(this.grid_program);
        this.gl.enableVertexAttribArray(this.vertex_grid_location);
        this.gl.vertexAttribPointer(this.vertex_grid_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[0]);
        this.gl.uniform1i(this.grid_color_location, 0);

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.uniforms.grid_size.x * this.uniforms.grid_size.y);

        [this.color_buffer[0], this.color_buffer[1]] = [this.color_buffer[1], this.color_buffer[0]];
        [this.frame_buffer[0], this.frame_buffer[1]] = [this.frame_buffer[1], this.frame_buffer[0]];

        this.uniforms.frame += 1;
    }

    synchronize() {
        const width = Math.min(this.canvas.clientWidth, this.max_render_size.x);
        const height = Math.min(this.canvas.clientHeight, this.max_render_size.y);
        this.canvas.width = width;
        this.canvas.height = height;
        this.uniforms.canvas_size = Vector.vec(width, height);
        this.uniforms.grid_size = Vector.vec(Math.floor(width / this.square_size), Math.floor(height / this.square_size));

        console.log(this.uniforms);
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

function randomPositions(n, max = 1.0, min = 0.0) {
    let positions = [];
    for (let i = 0; i < n; i++) {
        let x = Math.random() * (max - min) + min;
        let y = Math.random() * (max - min) + min;
        let z = Math.random() * (max - min) + min;
        positions.push(x);
        positions.push(y);
        positions.push(z);
    }
    return positions;
}

function randomVelocities(n, multiplier = 1.0) {
    let velocities = [];
    for (let i = 0; i < n; i++) {
        let x = Math.random() * 2.0 - 1.0;
        let y = Math.random() * 2.0 - 1.0;
        let z = Math.random() * 2.0 - 1.0;
        let length = Math.sqrt(x*x + y*y + z*z);
        velocities.push(x / length * multiplier);
        velocities.push(y / length * multiplier);
        velocities.push(z / length * multiplier);
    }
    return velocities;
}

const engine = await ParticleSimulator.initialize(document.getElementById("canvas"));
// engine.draw();
let animation_id = requestAnimationFrame(animate);

async function animate() {
    engine.draw();
    animation_id = requestAnimationFrame(animate);
}