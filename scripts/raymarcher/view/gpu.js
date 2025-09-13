import Vector from '../../utility/vector.js';
import Matrix from '../../utility/matrix.js';

export default class GPUManager {
    static async initialize(canvas, compute_url, render_url, sdf_url) {
        if (!navigator.gpu) {
            document.getElementById("menu").innerText = "WebGPU not supported on this browser.";
            throw new Error("WebGPU not supported on this browser.");
        }
			
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            document.getElementById("menu").innerText = "No appropriate GPUAdapter found.";
            throw new Error("No appropriate GPUAdapter found.");
        }
			
        const device = await adapter.requestDevice();
        const compute_code = await (await fetch(compute_url)).text();
        const render_code = await (await fetch(render_url)).text();
        const sdf_code = await (await fetch(sdf_url)).text();

        return new GPUManager(canvas, device, compute_code, render_code, sdf_code);
    }

    constructor(canvas, device, compute_shader_code, render_shader_code, sdf_code) {
        this.canvas = canvas;
        this.device = device;
        this.context;
        this.color_buffer;
        this.uniform_buffer;
        this.compute_bind_group;
        this.compute_pipeline;
        this.render_bind_group;
        this.render_pipeline;
        this.compute_module;
        this.compute_shader_code = compute_shader_code;
        this.render_shader_code = render_shader_code;

        this.workgroup_size = {x: 16, y: 16};
        this.base_render_size = {x: 2560, y: 1440};
        this.sun_rotation = Vector.vec(45, 45);
        
        this.uniforms = {
            canvas_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),
            buffer_size: Vector.vec(this.base_render_size.x, this.base_render_size.y),

            render_scale: 1,
            temporal_counter: 1.0,
            focus_distance: 1.0,
            focus_strength: 0.0,

            camera_rotation: Matrix.mat(1.0),
            camera_position: Vector.vec(0.0),
            fov: 1.0,

            sun_direction: Vector.vec(1.0),
            shader_mode: 0,

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

        this.setupRendering(compute_shader_code, render_shader_code, sdf_code);
        setTimeout(() => {this.syncResolution(); this.refreshScreen();}, 100);
    }
    
    destroy() {
        if (this.color_buffer) {
            this.color_buffer.destroy();
            this.color_buffer = null;
        }
        if (this.uniform_buffer) {
            this.uniform_buffer.destroy();
            this.uniform_buffer = null;
        }
        if (this.device) {
            this.device.destroy();
            this.device = null;
        }
    }

    render() {
        const command_encoder = this.device.createCommandEncoder();
			
        const compute_pass = command_encoder.beginComputePass();
        compute_pass.setPipeline(this.compute_pipeline);
        compute_pass.setBindGroup(0, this.compute_bind_group);
        compute_pass.dispatchWorkgroups(
            Math.ceil(
                this.uniforms.canvas_size.x / this.uniforms.render_scale / this.workgroup_size.x
            ), 
            Math.ceil(
                this.uniforms.canvas_size.y / this.uniforms.render_scale / this.workgroup_size.y
            )
        );
        compute_pass.end();

        const render_pass = command_encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 1.0, g: 0, b: 1.0, a: 1.0 },
                storeOp: "store",
            }]
        });
        render_pass.setPipeline(this.render_pipeline);
        render_pass.setBindGroup(0, this.render_bind_group);
        render_pass.draw(6, 1, 0, 0);
        render_pass.end();
			
        this.device.queue.submit([command_encoder.finish()]);
    }

    writeUniforms() {
        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.device.queue.writeBuffer(this.uniform_buffer, 0, uniform_array);
    }

    syncResolution() {
        let canvas_dimensions = this.canvas.getBoundingClientRect();
        canvas_dimensions.width = Math.min(canvas_dimensions.width, this.base_render_size.x);
        canvas_dimensions.height = Math.min(canvas_dimensions.height, this.base_render_size.y);
        
        this.uniforms.canvas_size = Vector.vec(canvas_dimensions.width, canvas_dimensions.height);
        this.canvas.height = canvas_dimensions.height;
        this.canvas.width = canvas_dimensions.width;
    }

    refreshScreen() {
        this.uniforms.temporal_counter = 1;
    }

    async recompileSDF(sdf_code) {
        this.setupRendering(this.compute_shader_code, this.render_shader_code, sdf_code);
        this.refreshScreen();
    }

    async getCompilationError() {
        const compilation_info = await this.compute_module.getCompilationInfo();
        if (compilation_info.messages.length > 0) {
            let text = "";
            for (const message of compilation_info.messages) {
                const type = (message.type === 'error') ? 'ERROR' : 'WARNING';
                text += type + ": " + message.message + "\n";
            }
            return text;
        } else {
            return "";
        }
    }

    setupRendering(compute_shader_code, render_shader_code, sdf_code) {

        const canvas_format = navigator.gpu.getPreferredCanvasFormat();
        this.context = this.canvas.getContext("webgpu");
        this.context.configure({
            device: this.device,
            format: canvas_format,
            alphaMode: "opaque"
        });

        const color_buffer_size = this.base_render_size.x * this.base_render_size.y * 16;
        this.color_buffer = this.device.createBuffer({
            label: "Color Storage Buffer",
            size: color_buffer_size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.uniform_buffer = this.device.createBuffer({
            label: "Unifrom Buffer",
            size: uniform_array.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.compute_module = this.device.createShaderModule({
            label: "Compute Shader Module",
            code: compute_shader_code + "\n" + sdf_code
        });
        
        const compute_bind_group_layout = this.device.createBindGroupLayout({
            label: "Compute Bind Group Layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {}
                }
            ]
        });
                
        this.compute_bind_group = this.device.createBindGroup({
            label: "Compute Bind Group",
            layout: compute_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_buffer,
                        offset: 0,
                        size: color_buffer_size
                    }
                },
                {
                    binding: 1,
                    resource: this.uniform_buffer
                }
            ]
        });

        const compute_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [compute_bind_group_layout]
        });

        this.compute_pipeline = this.device.createComputePipeline({
            label: "Compute Pipeline",
            layout: compute_pipeline_layout,
            compute: {
            module: this.compute_module,
            entryPoint: "computeMain",
            }
        });

        const render_module = this.device.createShaderModule({
            label: "Render Shader Module",
            code: render_shader_code
        });

        const render_bind_group_layout = this.device.createBindGroupLayout({
            label: "Render Bind Group Layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'storage',
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                }
            ]
        });
        
        this.render_bind_group = this.device.createBindGroup({
            label: "Render Bind Group",
            layout: render_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_buffer,
                        offset: 0,
                        size: color_buffer_size
                    }
                },
                {
                    binding: 1,
                    resource: this.uniform_buffer
                }
            ]
        });

        const render_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [render_bind_group_layout]
        });
                
        this.render_pipeline = this.device.createRenderPipeline({
            label: "Render Pipeline",
            layout: render_pipeline_layout,
            vertex: {
                module: render_module,
                entryPoint: "vertexMain"
            },
            fragment: {
                module: render_module,
                entryPoint: "fragmentMain",
                targets: [{
                    format: "bgra8unorm"
                }]
            },
            primitive: {
                topology: "triangle-list"
            }
        });
    }

    screenshot(file_name) {
        bufferToImage(file_name, this.color_buffer, this.device, this.base_render_size.x, this.base_render_size.y, this.uniforms.canvas_size.x, this.uniforms.canvas_size.y);
    }
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

async function bufferToImage(file_name, buffer, device, buffer_width, buffer_height, render_width, render_height) {
    buffer_width = Math.floor(buffer_width);
    buffer_height = Math.floor(buffer_height);
    render_width = Math.floor(render_width);
    render_height = Math.floor(render_height);

    const buffer_size = buffer_width * buffer_height * 16;
    const staging_buffer = device.createBuffer({
        size: buffer_size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const command_encoder = device.createCommandEncoder();
    command_encoder.copyBufferToBuffer(buffer, 0, staging_buffer, 0, buffer_size);
    device.queue.submit([command_encoder.finish()]);

    await staging_buffer.mapAsync(GPUMapMode.READ);
    const buffer_data = new Uint8Array(staging_buffer.getMappedRange());
    
    const float_data = new Float32Array(buffer_data.buffer);
    const uint8_data = new Uint8ClampedArray(render_width * render_height * 4);
    let uint8_index = 0;
    for (let i = 0; i < float_data.length; i++) {
        const x = Math.floor(i / 4) % buffer_width;
        const y = Math.floor(Math.floor(i / 4) / buffer_width);

        if (x >= render_width || y >= render_height)
            continue;
        if (uint8_index > render_width * render_height * 4)
            break;

        const e = 2.71828;
        const value = 1 - Math.pow(e, -1 * float_data[i]);

        uint8_data[uint8_index] = ((uint8_index + 1) % 4 == 0) ? 255 : Math.min(255, Math.max(0, value * 255));
        uint8_index += 1;
    }

    const image_data = new ImageData(uint8_data, render_width, render_height);
    const image_bitmap = await createImageBitmap(image_data);
    
    const canvas = document.createElement('canvas');
    canvas.width = render_width;
    canvas.height = render_height;
    canvas.getContext('2d').drawImage(image_bitmap, 0, 0);
    
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file_name;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}