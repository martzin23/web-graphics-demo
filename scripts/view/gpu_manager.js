import Vector from '../utility/vector.js';
import Matrix from '../utility/matrix.js';

export default class GPUManager {
    static async initialize(canvas, compute_url, render_url) {
        if (!navigator.gpu)
            throw new Error("WebGPU not supported on this browser.");
			
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter)
            throw new Error("No appropriate GPUAdapter found.");
			
        const device = await adapter.requestDevice();
        const compute_shader = await (await fetch(compute_url)).text();
        const render_shader = await (await fetch(render_url)).text();

        return new GPUManager(canvas, device, compute_shader, render_shader);
    }

    constructor(canvas, device, compute_shader, render_shader) {
        this.canvas = canvas;
        this.device = device;
        this.context;
        this.color_buffer;
        this.uniform_buffer;
        this.compute_bind_group;
        this.compute_pipeline;
        this.render_bind_group;
        this.render_pipeline;
        this.workgroup_size = {x: 8, y: 8};
        this.base_render_size = {x: 2560, y: 1440};

        // Uniform variables
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

            max_bounces: 5,
            max_marches: 100,
            epsilon: 0.0001,
            detail: 10,

            custom_a: -2.0,
            custom_b: 1.0,
            custom_c: 0.5,
            custom_d: 2.0
        };

        // Context and WebGPU
        const canvas_format = navigator.gpu.getPreferredCanvasFormat();
        this.context = this.canvas.getContext("webgpu");
        this.context.configure({
            device: this.device,
            format: canvas_format,
            alphaMode: "opaque"
        });

        // Buffers
        const color_buffer_size = this.base_render_size.x * this.base_render_size.y * 16;
        this.color_buffer = this.device.createBuffer({
            label: "Color Storage Buffer",
            size: color_buffer_size,
            usage: GPUBufferUsage.STORAGE
        });

        const uniform_array = new Float32Array(packUniforms(this.uniforms));
        this.uniform_buffer = this.device.createBuffer({
            label: "Unifrom Buffer",
            size: uniform_array.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Pipelines
        [this.compute_pipeline, this.compute_bind_group] = makeComputePipeline(this.device, compute_shader, this.color_buffer, this.uniform_buffer, color_buffer_size);
        [this.render_pipeline, this.render_bind_group] = makeRenderPipeline(this.device, render_shader, this.color_buffer, this.uniform_buffer, color_buffer_size);
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

function makeComputePipeline(device, compute_shader_code, color_buffer, uniform_buffer, color_buffer_size) {

    const compute_module = device.createShaderModule({
        label: "Compute Shader Module",
        code: compute_shader_code
    });
    
    const compute_bind_group_layout = device.createBindGroupLayout({
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
            
    const compute_bind_group = device.createBindGroup({
        label: "Compute Bind Group",
        layout: compute_bind_group_layout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: color_buffer,
                    offset: 0,
                    size: color_buffer_size
                }
            },
            {
                binding: 1,
                resource: uniform_buffer
            }
        ]
    });

    const compute_pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [compute_bind_group_layout]
    });

    const compute_pipeline = device.createComputePipeline({
        label: "Compute Pipeline",
        layout: compute_pipeline_layout,
        compute: {
        module: compute_module,
        entryPoint: "computeMain",
        }
    });

    return [compute_pipeline, compute_bind_group];
}

function makeRenderPipeline(device, render_shader_code, color_buffer, uniform_buffer, color_buffer_size) {

    const render_module = device.createShaderModule({
        label: "Render Shader Module",
        code: render_shader_code
    });

    const render_bind_group_layout = device.createBindGroupLayout({
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
    
    const render_bind_group = device.createBindGroup({
        label: "Render Bind Group",
        layout: render_bind_group_layout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: color_buffer,
                    offset: 0,
                    size: color_buffer_size
                }
            },
            {
                binding: 1,
                resource: uniform_buffer
            }
        ]
    });

    const render_pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts: [render_bind_group_layout]
    });
            
    const render_pipeline = device.createRenderPipeline({
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

    return [render_pipeline, render_bind_group];
}