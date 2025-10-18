import * as WebGL from "../utility/webgl.js";

class ParticleSimulator {
    static async initialize(canvas) {
        const grid_vertex_code = await (await fetch('./scripts/particles/shader/grid_vertex.glsl')).text();
        const grid_fragment_code = await (await fetch('./scripts/particles/shader/grid_fragment.glsl')).text();
        const particle_vertex_code = await (await fetch('./scripts/particles/shader/particle_vertex.glsl')).text();
        const particle_fragment_code = await (await fetch('./scripts/particles/shader/particle_fragment.glsl')).text();
        const blend_vertex_code = await (await fetch('./scripts/particles/shader/blend_vertex.glsl')).text();
        const blend_fragment_code = await (await fetch('./scripts/particles/shader/blend_fragment.glsl')).text();
        return new ParticleSimulator(canvas, grid_vertex_code, grid_fragment_code, particle_vertex_code, particle_fragment_code, blend_vertex_code, blend_fragment_code);
    }

    constructor(canvas, grid_vertex_code, grid_fragment_code, particle_vertex_code, particle_fragment_code, blend_vertex_code, blend_fragment_code) {
        this.canvas = canvas;
        this.square_size = 20;
        this.particle_count = 100;

        this.vertex_buffer;
        this.vertex_grid_location;
        this.vertex_particle_location;
        this.vertex_blend_location;

        this.color_buffer = [];
        this.color_grid_location;
        this.color_blend_location;

        this.frame_buffer;
        this.uniform_buffer;

        this.position_buffer = [];
        this.position_location;
        this.position_data = new Float32Array(createPositions(this.particle_count));

        this.velocity_buffer = [];
        this.velocity_location;
        this.velocity_data = new Float32Array(createVelocities(this.particle_count));

        this.grid_program;
        this.particle_program;
        this.blend_program;

        this.uniforms = {
            buffer_size: {width: 2560, height: 1440},
            canvas_size: {width: 0.0, height: 0.0},
            grid_size: {width: Math.floor(2560 / this.square_size), height: Math.floor(1440 / this.square_size)},
            gap: 0.75,
            blend: 0.1,
            frame: 0,
        };

        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl)
            throw new Error("This device or browser does not support WebGL2.");

        window.addEventListener("resize", () => {this.synchronize();});
        this.canvas.addEventListener("resize", () => {this.synchronize();});

        this.grid_program = WebGL.createProgram(this.gl, grid_vertex_code, grid_fragment_code);
        this.blend_program = WebGL.createProgram(this.gl, blend_vertex_code, blend_fragment_code);

        this.particle_program = WebGL.createProgram(this.gl, particle_vertex_code, particle_fragment_code);
        WebGL.setFeedbaclVaryings(this.gl, this.particle_program, ["output_position", "output_velocity"]);

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
        
        this.position_buffer[0] = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.position_buffer[0]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.position_data.byteLength, this.gl.DYNAMIC_COPY);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.position_data);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        
        this.position_buffer[1] = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.position_buffer[1]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.position_data.byteLength, this.gl.DYNAMIC_COPY);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        
        this.velocity_buffer[0] = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocity_buffer[0]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.velocity_data.byteLength, this.gl.DYNAMIC_COPY);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.velocity_data);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        
        this.velocity_buffer[1] = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocity_buffer[1]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.velocity_data.byteLength, this.gl.DYNAMIC_COPY);
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
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.uniforms.grid_size.width, this.uniforms.grid_size.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        this.color_buffer[1] = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, this.uniforms.grid_size.width, this.uniforms.grid_size.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        this.frame_buffer = this.gl.createFramebuffer();

        this.vertex_grid_location = this.gl.getAttribLocation(this.grid_program, "vertex_position");
        this.vertex_particle_location = this.gl.getAttribLocation(this.particle_program, "vertex_position");
        this.vertex_blend_location = this.gl.getAttribLocation(this.blend_program, "vertex_position");
        this.position_location = this.gl.getAttribLocation(this.particle_program, "input_position");
        this.velocity_location = this.gl.getAttribLocation(this.particle_program, "input_velocity");
        this.color_grid_location = this.gl.getUniformLocation(this.grid_program, 'color_buffer');
        this.color_blend_location = this.gl.getUniformLocation(this.particle_program, 'color_buffer');

        this.synchronize();
    }

    draw() {
        // update uniform buffer
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, new Float32Array(packUniforms(this.uniforms)), this.gl.DYNAMIC_DRAW);


        // blend pass
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frame_buffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer[0], 0);

        this.gl.viewport(0, 0, this.uniforms.grid_size.width, this.uniforms.grid_size.height);
        this.gl.useProgram(this.blend_program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.vertex_blend_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(this.vertex_blend_location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[1]);
        this.gl.uniform1i(this.color_blend_location, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);


        // particle pass
        this.gl.useProgram(this.particle_program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.position_buffer[0]);
        this.gl.vertexAttribPointer(this.position_location, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(this.position_location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocity_buffer[0]);
        this.gl.vertexAttribPointer(this.velocity_location, 3, this.gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(this.velocity_location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.position_buffer[1]);
        this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.velocity_buffer[1]);

        this.gl.beginTransformFeedback(this.gl.POINTS);
        this.gl.drawArrays(this.gl.POINTS, 0, this.particle_count);
        this.gl.endTransformFeedback();

        this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
        this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


        // grid pass
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.canvas_size.width, this.uniforms.canvas_size.height);

        this.gl.useProgram(this.grid_program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.vertex_grid_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.enableVertexAttribArray(this.vertex_grid_location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer[0]);
        this.gl.uniform1i(this.color_grid_location, 0);
        
        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.uniforms.grid_size.width * this.uniforms.grid_size.height);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);


        // swap buffers
        [this.color_buffer[0], this.color_buffer[1]] = [this.color_buffer[1], this.color_buffer[0]];
        [this.frame_buffer[0], this.frame_buffer[1]] = [this.frame_buffer[1], this.frame_buffer[0]];
        [this.position_buffer[0], this.position_buffer[1]] = [this.position_buffer[1], this.position_buffer[0]];
        [this.velocity_buffer[0], this.velocity_buffer[1]] = [this.velocity_buffer[1], this.velocity_buffer[0]];

        this.uniforms.frame += 1;
    }

    synchronize() {
        const width = Math.min(this.canvas.clientWidth, this.uniforms.buffer_size.width);
        const height = Math.min(this.canvas.clientHeight, this.uniforms.buffer_size.height);
        this.canvas.width = width;
        this.canvas.height = height;
        this.uniforms.canvas_size.width = width;
        this.uniforms.canvas_size.height = height;
        this.uniforms.grid_size.width = Math.floor(width / this.square_size);
        this.uniforms.grid_size.height = Math.floor(height / this.square_size);
    }
}

function packUniforms(data) {
    let array = [];
    for (const el in data) {
        if (typeof data[el] === "number")
            array.push(data[el]);
        else
            array.push(Object.values(data[el]));
    }
    return array.flat();
}

function createPositions(n) {
    const max = 1.0;
    const min = -1.0;
    let positions = [];

    for (let i = 0; i < n; i++) {
        let x = Math.random() * (max - min) + min;
        let y = Math.random() * (max - min) + min;
        let z = Math.random() * (max - min) + min;
        y = 0;
        z = 0;
        positions.push(x);
        positions.push(y);
        positions.push(z);
    }
    return positions;
}

function createVelocities(n) {
    const multiplier = 0.02;
    let velocities = [];

    for (let i = 0; i < n; i++) {
        // let x = Math.random() * 2.0 - 1.0;
        // let y = Math.random() * 2.0 - 1.0;
        // let z = Math.random() * 2.0 - 1.0;
        let x = 0;
        let y = 1;
        let z = 0;
        velocities.push(x * multiplier);
        velocities.push(y * multiplier);
        velocities.push(z * multiplier);
    }
    return velocities;
}

async function run() {
    let previous = performance.now();
    const target_fps = 30;
    let engine;
    try {
        engine = await ParticleSimulator.initialize(document.getElementById("canvas"));
        requestAnimationFrame(animate);
    } catch (error) {
        console.warn("WebGL2 or some of its aspects couldn't initalize, hiding canvas.");
        canvas.style.display = "none";
    }
    
    async function animate() {
        const now = performance.now();
        if ((now - previous) > (1000 / target_fps)) {
            previous = now;
            engine.draw();
        }
        requestAnimationFrame(animate);
    }
}

run();