import Matrix from "../../utility/matrix.js";
import Vector from "../../utility/vector.js";

/*
TODO
color buffer
compute shader setup
uniform buffer

fragment translation
vertex translation
copute translaton

screenshot
*/

export default class WebGLManager {
    static async initialize(canvas, compute_url, render_url, sdf_url) {
        const compute_shader_code = await (await fetch(compute_url)).text();
        const render_shader_code = await (await fetch(render_url)).text();
        const sdf_code = await (await fetch(sdf_url)).text();
        return new WebGLManager(canvas, compute_shader_code, render_shader_code, sdf_code);
    }

    constructor(canvas, compute_shader_code, render_shader_code, sdf_code) {
        this.canvas = canvas;
        this.compute_shader_code = compute_shader_code;
        this.render_shader_code = render_shader_code;

        this.vertex_buffer;
        this.color_buffer;
        this.uniform_buffer;
        this.frame_buffer;
        this.render_vertex_location;
        this.compute_vertex_location;
        this.compute_color_buffer_location;
        this.render_color_buffer_location;
        this.compute_program;
        this.render_program;
        
        this.sun_rotation = Vector.vec(45, 45);
        this.base_render_size = {x: 2560, y: 1440};
        this.gl = this.canvas.getContext("webgl2");
        const ext = this.gl.getExtension('EXT_color_buffer_float');
        if (!ext) console.error("Failed to get extension");

        this.uniforms = {
            canvas_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),
            buffer_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),

            render_scale: 1.0,
            temporal_counter: 1.0,
            focus_distance: 1.0,
            focus_strength: 0.0,

            camera_rotation: Matrix.mat(1.0),
            camera_position: Vector.vec(0.0, -3.0, 0.0),
            fov: 1.0,

            sun_direction: Vector.vec(1.0),
            shader_mode: 1,

            max_bounces: 3,
            max_marches: 50,
            epsilon: 0.001,
            normals_precision: 0.0001,

            detail: 10,
            sun_intensity: 100.0,
            sky_intensity: 0.5,
            custom_a: -2.0,

            custom_b: 1.0,
            custom_c: 0.5,
            custom_d: 2.0,
            custom_e: 2.0
        };

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

        this.color_buffer = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA16F, this.base_render_size.x, this.base_render_size.y, 0, this.gl.RGBA, this.gl.FLOAT, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.frame_buffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,  this.frame_buffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.setup(compute_shader_code + sdf_code, render_shader_code);
        this.synchronize();
    }

    setup(compute_fragment_shader_code, render_fragment_shader_code) {
        const vertex_shader_code = `#version 300 es
            precision mediump float;
            in vec2 vertex_position;
            out vec2 texture_coordinates;

            void main() {
                texture_coordinates = vertex_position * 0.5 + 0.5;
                gl_Position = vec4(vertex_position, 0.0, 1.0);
            }
        `;

        this.compute_program = makeProgram(this.gl, vertex_shader_code, compute_fragment_shader_code);
        this.render_program = makeProgram(this.gl, vertex_shader_code, render_fragment_shader_code);

        const uniform_binding_number = 1;
        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.gl.uniformBlockBinding(this.compute_program, this.gl.getUniformBlockIndex(this.compute_program, "UniformBlock"), uniform_binding_number);
        this.gl.uniformBlockBinding(this.render_program, this.gl.getUniformBlockIndex(this.render_program, "UniformBlock"), uniform_binding_number);
        this.uniform_buffer = this.gl.createBuffer();
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, uniform_binding_number, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, uniform_array.byteLength, this.gl.DYNAMIC_DRAW);

        this.compute_color_buffer_location = this.gl.getUniformLocation(this.compute_program, 'color_buffer');
        this.render_color_buffer_location = this.gl.getUniformLocation(this.render_program, 'color_buffer');
        this.render_vertex_location = this.gl.getAttribLocation(this.render_program, "vertex_position");
        this.compute_vertex_location = this.gl.getAttribLocation(this.compute_program, "vertex_position");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.render_vertex_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        this.gl.vertexAttribPointer(this.compute_vertex_location, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    }

    render() {
        
        // updating uniforms
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.uniform_buffer);
        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, uniform_array, this.gl.DYNAMIC_DRAW);

        // computing the image
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frame_buffer);
        
        // this.gl.viewport(0, 0, this.uniforms.buffer_size.x, this.uniforms.buffer_size.y);
        this.gl.viewport(0, 0, Math.ceil(this.uniforms.canvas_size.x / this.uniforms.render_scale), Math.ceil(this.uniforms.canvas_size.y / this.uniforms.render_scale));
        // console.log(this.uniforms.canvas_size);
        // console.log(this.uniforms.buffer_size);
        // console.log(
        //     Math.floor((this.uniforms.buffer_size.x - this.uniforms.canvas_size.x) / 2.0),
        //     Math.floor((this.uniforms.buffer_size.y - this.uniforms.canvas_size.y) / 2.0), 
        //     Math.floor(this.uniforms.buffer_size.x - (this.uniforms.buffer_size.x - this.uniforms.canvas_size.x) / 2.0), 
        //     Math.floor(this.uniforms.buffer_size.y - (this.uniforms.buffer_size.y - this.uniforms.canvas_size.y) / 2.0)
        // );
        // this.gl.viewport(
        //     Math.floor((this.uniforms.buffer_size.x - this.uniforms.canvas_size.x) / 2.0),
        //     Math.floor((this.uniforms.buffer_size.y - this.uniforms.canvas_size.y) / 2.0), 
        //     Math.floor(this.uniforms.canvas_size.x), 
        //     Math.floor(this.uniforms.canvas_size.y)
        // );
        this.gl.clearColor(1.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        this.gl.useProgram(this.compute_program);

        this.gl.enableVertexAttribArray(this.compute_vertex_location);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer);
        this.gl.uniform1i(this.compute_color_buffer_location, 0);
        
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // rendering to canvas
        this.gl.clearColor(0.0, 0.0, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.uniforms.canvas_size.x, this.uniforms.canvas_size.y);
        // this.gl.viewport(0, 0, this.uniforms.buffer_size.x, this.uniforms.buffer_size.y);

        this.gl.useProgram(this.render_program);

        this.gl.enableVertexAttribArray(this.render_vertex_location);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer);
        this.gl.uniform1i(this.render_color_buffer_location, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    synchronize() {
        const width = Math.min(this.canvas.clientWidth, this.base_render_size.x);
        const height = Math.min(this.canvas.clientHeight, this.base_render_size.y);
        this.uniforms.canvas_size = Vector.vec(width, height);
        this.canvas.width = width;
        this.canvas.height = height;
    }

    refresh() {
        this.uniforms.temporal_counter = 1.0;
    }

    async recompile(sdf_code) {
        this.setup(this.compute_shader_code + "\n" + sdf_code, this.render_shader_code);
    }

    screenshot() {
        console.log("screenshot");
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

// const renderer = await WebGLManager.initialize(
//     document.getElementById("canvas"),
//     "../scripts/raymarcher/view/shader/compute.glsl",
//     "../scripts/raymarcher/view/shader/render.glsl",
//     "../scripts/raymarcher/view/shader/kochcurve.glsl"
// );
// renderer.render();
