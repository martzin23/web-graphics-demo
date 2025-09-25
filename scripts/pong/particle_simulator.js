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
        const simulate_vertex_code = await (await fetch('../scripts/pong/shader/simulate_vertex.glsl')).text();
        const simulate_fragment_code = await (await fetch('../scripts/pong/shader/simulate_fragment.glsl')).text();
        return new ParticleSimulator(canvas, grid_vertex_code, grid_fragment_code, particle_vertex_code, particle_fragment_code, blend_vertex_code, blend_fragment_code, simulate_vertex_code, simulate_fragment_code);
    }

    constructor(canvas, grid_vertex_code, grid_fragment_code, particle_vertex_code, particle_fragment_code, blend_vertex_code, blend_fragment_code, simulate_vertex_code, simulate_fragment_code) {
        this.canvas = canvas;
        this.square_size = 20;
        this.particle_count = 1;

        this.vertex_buffer;
        this.vertex_grid_location;
        this.vertex_particle_location;
        this.vertex_blend_location;

        this.color_buffer = [];
        this.grid_color_location;
        this.blend_color_location;

        this.frame_buffer;
        this.uniform_buffer;

        this.particle_buffer = [];
        this.particle_location;
        this.particle_data = new Float32Array(interleaveArrays(3, randomPositions(this.particle_count, 1.0, -1.0), randomVelocities(this.particle_count, 0.01)));
        console.log(this.particle_data);

        this.grid_program;
        this.particle_program;
        this.blend_program;
        this.simulate_program;

        this.uniforms = {
            buffer_size: Vector.vec(2560, 1440),
            canvas_size: Vector.vec(0.0, 0.0),
            grid_size: Vector.vec(Math.floor(2560 / this.square_size), Math.floor(1440 / this.square_size)),
            gap: 0.75,
            blend: 0.1,
            frame: 0,
        };

        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl)
            throw new Error("This device or browser does not support WebGL2.");

        window.addEventListener("resize", () => {this.synchronize();});
        this.canvas.addEventListener("resize", () => {this.synchronize();});

        this.grid_program = makeProgram(this.gl, grid_vertex_code, grid_fragment_code);
        this.particle_program = makeProgram(this.gl, particle_vertex_code, particle_fragment_code);
        this.blend_program = makeProgram(this.gl, blend_vertex_code, blend_fragment_code);

        this.simulate_program = makeProgram(this.gl, simulate_vertex_code, simulate_fragment_code);
        this.gl.transformFeedbackVaryings(this.simulate_program, ["output_position", "output_velocity"], this.gl.INTERLEAVED_ATTRIBS);
        this.gl.linkProgram(this.simulate_program);
        if (!this.gl.getProgramParameter(this.simulate_program, this.gl.LINK_STATUS)) {
            const error_message = this.gl.getProgramInfoLog(this.simulate_program);
            throw new SyntaxError("Error in program linking:\n" + error_message);
        }

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
        
        this.particle_buffer[0] = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particle_buffer[0]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.particle_data.byteLength, this.gl.DYNAMIC_COPY);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.particle_data);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        
        this.particle_buffer[1] = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particle_buffer[1]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.particle_data.byteLength, this.gl.DYNAMIC_COPY);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        const uniform_binding_number = 0;
        this.uniform_buffer = this.gl.createBuffer();
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, uniform_binding_number, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, (new Float32Array(packUniforms(this.uniforms))).byteLength, this.gl.DYNAMIC_DRAW);
        this.gl.uniformBlockBinding(this.grid_program, this.gl.getUniformBlockIndex(this.grid_program, "UniformBlock"), uniform_binding_number);
        this.gl.uniformBlockBinding(this.particle_program, this.gl.getUniformBlockIndex(this.particle_program, "UniformBlock"), uniform_binding_number);
        this.gl.uniformBlockBinding(this.blend_program, this.gl.getUniformBlockIndex(this.particle_program, "UniformBlock"), uniform_binding_number);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

        this.color_buffer[0] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[0]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.uniforms.grid_size.x, this.uniforms.grid_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        this.color_buffer[1] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.uniforms.grid_size.x, this.uniforms.grid_size.y, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        this.frame_buffer = this.gl.createFramebuffer();

        this.vertex_grid_location = this.gl.getAttribLocation(this.grid_program, "vertex_position");
        this.vertex_particle_location = this.gl.getAttribLocation(this.particle_program, "vertex_position");
        this.vertex_blend_location = this.gl.getAttribLocation(this.blend_program, "vertex_position");

        this.grid_color_location = this.gl.getUniformLocation(this.grid_program, 'color_buffer');
        this.blend_color_location = this.gl.getUniformLocation(this.particle_program, 'color_buffer');

        this.particle_location = this.gl.getUniformLocation(this.particle_program, 'particle_buffer');

        this.synchronize();
    }

    draw() {
        // update uniform buffer
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, new Float32Array(packUniforms(this.uniforms)), this.gl.DYNAMIC_DRAW);


        // simulation pass
        this.gl.useProgram(this.simulate_program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particle_buffer[0]);
        this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        this.gl.enableVertexAttribArray(0);
        this.gl.enableVertexAttribArray(1);

        this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.particle_buffer[1]);

        this.gl.enable(this.gl.RASTERIZER_DISCARD);
        this.gl.beginTransformFeedback(this.gl.POINTS);
        // this.gl.drawArrays(this.gl.TRIANGLES, 0, this.particle_count);
        this.gl.drawArrays(this.gl.POINTS, 0, this.particle_count);
        this.gl.endTransformFeedback();
        this.gl.disable(this.gl.RASTERIZER_DISCARD);

        this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        // const view2 = new Float32Array(this.particle_data.length);
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particle_buffer[0]);
        // this.gl.getBufferSubData(this.gl.ARRAY_BUFFER, 0, view2);
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        // console.log(view2);
        
        // const view = new Float32Array(this.particle_data.length);
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particle_buffer[1]);
        // this.gl.getBufferSubData(this.gl.ARRAY_BUFFER, 0, view);
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        // console.log(view);


        // blend pass
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frame_buffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer[0], 0);

        this.gl.viewport(0, 0, this.uniforms.grid_size.x, this.uniforms.grid_size.y);
        this.gl.useProgram(this.blend_program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.vertex_blend_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(this.vertex_blend_location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        this.gl.uniform1i(this.blend_color_location, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);


        // particle pass
        this.gl.useProgram(this.particle_program);

        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        // this.gl.vertexAttribPointer(this.vertex_particle_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        // this.gl.enableVertexAttribArray(this.vertex_particle_location);
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particle_buffer[1]);
        this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        this.gl.enableVertexAttribArray(0);
        this.gl.enableVertexAttribArray(1);

        // this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.particle_count);
        this.gl.drawArrays(this.gl.POINTS, 0, this.particle_count);
        // this.gl.drawArrays(this.gl.TRIANGLES, 0, this.particle_count);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);


        // grid pass
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.canvas_size.x, this.uniforms.canvas_size.y);

        this.gl.useProgram(this.grid_program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.vertex_grid_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(this.vertex_grid_location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[0]);
        this.gl.uniform1i(this.grid_color_location, 0);
        
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.uniforms.grid_size.x * this.uniforms.grid_size.y);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);


        [this.color_buffer[0], this.color_buffer[1]] = [this.color_buffer[1], this.color_buffer[0]];
        [this.frame_buffer[0], this.frame_buffer[1]] = [this.frame_buffer[1], this.frame_buffer[0]];
        [this.particle_buffer[0], this.particle_buffer[1]] = [this.particle_buffer[1], this.particle_buffer[0]];

        this.uniforms.frame += 1;
    }

    synchronize() {
        const width = Math.min(this.canvas.clientWidth, this.uniforms.buffer_size.x);
        const height = Math.min(this.canvas.clientHeight, this.uniforms.buffer_size.y);
        this.canvas.width = width;
        this.canvas.height = height;
        this.uniforms.canvas_size = Vector.vec(width, height);
        this.uniforms.grid_size = Vector.vec(Math.floor(width / this.square_size), Math.floor(height / this.square_size));
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
        // let x = 1.0;
        // let y = 1.0;
        // let z = 1.0;
        positions.push(x);
        positions.push(y);
        // positions.push(z);
        positions.push(0);
    }
    return positions;
}

function randomVelocities(n, multiplier = 1.0) {
    let velocities = [];
    for (let i = 0; i < n; i++) {
        let x = Math.random() * 2.0 - 1.0;
        let y = Math.random() * 2.0 - 1.0;
        let z = Math.random() * 2.0 - 1.0;
        // let x = 1.0;
        // let y = 1.0;
        // let z = 1.0;
        velocities.push(x * multiplier);
        velocities.push(y * multiplier);
        // velocities.push(z * multiplier);
        velocities.push(0);
        // let length = Math.sqrt(x*x + y*y + z*z);
        // velocities.push(x / length * multiplier);
        // velocities.push(y / length * multiplier);
        // // velocities.push(z / length * multiplier);
        // velocities.push(0.0);
    }
    return velocities;
}

function interleaveArrays(attribute_size, ...arrays) {
    let result = [];
    for (let index = 0; index < arrays[0].length; index += attribute_size) {
        for (let array of arrays) {
            for (let attribute = 0; attribute < attribute_size; attribute++) {
                result.push(array[index + attribute]);   
            }
        }
    }
    return result;
}



let previous = performance.now();
let engine;
try {
    engine = await ParticleSimulator.initialize(document.getElementById("canvas"));
// engine.draw();
// engine.draw();
// engine.draw();
    requestAnimationFrame(animate);
} catch (error) {
    // console.warn("WARNING: WebGL2 not supported, hiding canvas.");
    console.error(error);
    canvas.style.display = "none";
}

async function animate() {
    const now = performance.now();
    if ((now - previous) > 10) {
        previous = now;
        engine.draw();
    }
    requestAnimationFrame(animate);
}