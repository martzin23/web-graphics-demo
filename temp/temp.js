/*
TODO
color buffer
uniform buffer
compute shader setup
fragment translation
vertex translation
copute translaton
screenshot
*/


function hellotriangle() {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl2");


    const vertices = new Float32Array([
        1.0, 1.0,
        1.0, -1.0,
        -1.0, -1.0,
        1.0, 1.0,
        -1.0, -1.0,
        -1.0, 1.0
    ]);

    const vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


    const vertex_shader_code = `#version 300 es
        precision mediump float;

        in vec2 vertex_position;

        void main() {
            gl_Position = vec4(vertex_position, 0.0, 1.0);
        }
    `;
    const vertex_shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex_shader, vertex_shader_code);
    gl.compileShader(vertex_shader);
    if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS)) {
        const error_message = gl.getShaderInfoLog(vertex_shader);
        console.error("Error in vertex stage:\n" + error_message);
        return;
    }


    const fragment_shader_code = `#version 300 es
        precision mediump float;

        out vec4 output_color;

        void main() {
            output_color = vec4(1.0, 0.0, 0.0, 1.0);
        }
    `;
    const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment_shader, fragment_shader_code);
    gl.compileShader(fragment_shader);
    if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS)) {
        const error_message = gl.getShaderInfoLog(fragment_shader);
        console.error("Error in fragment stage:\n" + error_message);
        return;
    }


    const render_program = gl.createProgram();
    gl.attachShader(render_program, vertex_shader);
    gl.attachShader(render_program, fragment_shader);
    gl.linkProgram(render_program);
    if (!gl.getProgramParameter(render_program, gl.LINK_STATUS)) {
        const error_message = gl.getProgramInfoLog(render_program);
        console.error("Error in render program linking:\n" + error_message);
        return;
    }

    const vertex_position_attribute_position = gl.getAttribLocation(render_program, "vertex_position");
    if (vertex_position_attribute_position < 0) {
        console.error("Failed to get attribute position for 'vertex_position'");
        return;
    }

    
    // output merger
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(1.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // rasterizer
    gl.viewport(0, 0, canvas.width, canvas.height);

    // vertex shader & fragment shader
    gl.useProgram(render_program);
    gl.enableVertexAttribArray(vertex_position_attribute_position);

    // input assembler
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.vertexAttribPointer(vertex_position_attribute_position, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

    // draw call & primitive assembly
    gl.drawArrays(gl.TRIANGLES, 0, 6);

}

hellotriangle();