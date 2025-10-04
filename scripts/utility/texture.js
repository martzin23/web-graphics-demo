import * as Loader from './loader.js';

export default class Texture {
    static async load(url) {
        const image = await Loader.loadImage(url);
        return new Texture(image.data, image.width, image.height);
    }

    constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
        this.buffer;
        this.binding;
        this.location;
    }

    create(gl, name, binding, program, mag_filter, wrap_mode) {
        this.binding = binding;
        this.location = gl.getUniformLocation(program, name);
        this.buffer = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.buffer);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag_filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap_mode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap_mode);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    bind(gl) {
        gl.activeTexture(this.binding);
        gl.bindTexture(gl.TEXTURE_2D, this.buffer);
        gl.uniform1i(this.location, 0);
    }
}