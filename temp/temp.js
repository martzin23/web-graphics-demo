import Matrix from "../scripts/utility/matrix.js";
import Vector from "../scripts/utility/vector.js";

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

class WebGLManager {
    static async initialize(canvas) {
        return new WebGLManager(canvas);
    }

    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.canvas.getContext("webgl2");
        const ext = this.gl.getExtension('EXT_color_buffer_float');
        if (!ext) console.error("Failed to get extension");

        this.vertex_buffer;
        this.color_buffer;
        this.render_vertex_attribute_position;
        this.compute_vertex_attribute_position;
        this.compute_program;
        this.render_program;
        this.base_render_size = {x: 2560, y: 1440};

        this.uniforms = {
            a: 1.0,
            b: 0.0,
        };

        this.setup();
    }

    setup() {
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
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA16F, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.FLOAT, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.frame_buffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,  this.frame_buffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.color_buffer, 0,);
        // const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        // switch (status) {
        //     case this.gl.FRAMEBUFFER_COMPLETE:
        //         console.log('Framebuffer is complete');
        //         break;
        //     case this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        //         console.error('Framebuffer incomplete: Attachment');
        //         break;
        //     case this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        //         console.error('Framebuffer incomplete: No attachments');
        //         break;
        //     case this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        //         console.error('Framebuffer incomplete: Dimensions mismatch');
        //         break;
        //     case this.gl.FRAMEBUFFER_UNSUPPORTED:
        //         console.error('Framebuffer unsupported: Format combination not supported');
        //         break;
        //     default:
        //         console.error('Framebuffer incomplete: Unknown error', status);
        // }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // --------------------------------------------------------------------

        const compute_vertex_shader_code = `#version 300 es
            precision mediump float;
            in vec2 vertex_position;
            out vec2 texture_coordinates;

            void main() {
                texture_coordinates = vertex_position * 0.5 + 0.5;
                gl_Position = vec4(vertex_position, 0.0, 1.0);
            }
        `;
        const compute_fragment_shader_code = `#version 300 es
            precision mediump float;

            layout(std140) uniform UniformBlock {
                float val1;
                float val2;
            };
            in vec2 texture_coordinates;
            out vec4 output_color;

            void main() {
                output_color = vec4(val1, sin(texture_coordinates.x * 100.0), 0.0, 1.0);
            }
        `;
        const render_vertex_shader_code = `#version 300 es
            precision mediump float;

            in vec2 vertex_position;
            out vec2 texture_coordinates;

            void main() {
                texture_coordinates = vertex_position * 0.5 + 0.5;
                gl_Position = vec4(vertex_position, 0.0, 1.0);
            }
        `;
        const render_fragment_shader_code = `#version 300 es
            precision mediump float;

            uniform sampler2D uPipeline1Result;
            in vec2 texture_coordinates;
            out vec4 output_color;

            void main() {
                vec4 temp = texture(uPipeline1Result, texture_coordinates);
                output_color = temp;
            }
        `;

        // --------------------------------------------------------------------

        this.compute_program = makeProgram(this.gl, compute_vertex_shader_code, compute_fragment_shader_code);
        this.render_program = makeProgram(this.gl, render_vertex_shader_code, render_fragment_shader_code);

        this.render_vertex_attribute_position = this.gl.getAttribLocation(this.render_program, "vertex_position");
        this.compute_vertex_attribute_position = this.gl.getAttribLocation(this.compute_program, "vertex_position");

        this.gl.uniformBlockBinding(this.render_program, this.gl.getUniformBlockIndex(this.compute_program, "UniformBlock"), 1);
        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.uniform_buffer = this.gl.createBuffer();
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 1, this.uniform_buffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, uniform_array.byteLength, this.gl.DYNAMIC_DRAW);
        
    }

    render() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frame_buffer);
        
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        this.gl.useProgram(this.compute_program);

        this.gl.enableVertexAttribArray(this.compute_vertex_attribute_position);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.compute_vertex_attribute_position, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
        
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        
        // output merger
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.gl.clearColor(1.0, 0.0, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // rasterizer
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // vertex shader & fragment shader
        this.gl.useProgram(this.render_program);
        this.gl.enableVertexAttribArray(this.render_vertex_attribute_position);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_buffer);
        const textureLocation =  this.gl.getUniformLocation(this.render_program, 'uPipeline1Result');
        this.gl.uniform1i(textureLocation, 0);

        // input assembler
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);
        this.gl.vertexAttribPointer(this.render_vertex_attribute_position, 2, this.gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

        // draw call & primitive assembly
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    synchronize() {

    }

    refresh() {
        console.log("refreshscreen");
    }

    async recompile() {
        console.log("compilesdf");

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

const renderer = await WebGLManager.initialize(document.getElementById("canvas"));
renderer.render();
