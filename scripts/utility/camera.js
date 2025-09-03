import Vector from './vector.js';
import Matrix from './matrix.js';

export default class Camera {
    constructor(
        position = Vector.vec(0.0, -1.0, 0.0), 
        rotation = {h : 0.0, v : 0.0}, 
        fov = 0.5, 
        speed = 0.05, 
        sensitivity = 0.1,
        focus_distance = 1.0,
        focus_blur = 0.0
    ) {
        this.position = position;
        this.rotation = rotation;
        this.fov = fov;
        this.speed = speed;
        this.sensitivity = sensitivity;
        this.focus_distance = focus_distance;
        this.focus_blur = focus_blur;
        this.cursor = {}
    }

    getRotationMatrix() {
        let result = Matrix.mat();
        result = Matrix.rot(result, this.rotation.h, Vector.vec(0.0, 0.0, 1.0));
        result = Matrix.rot(result, this.rotation.v, Vector.vec(1.0, 0.0, 0.0));
        return result;
    }

    getDirection() {
        return Matrix.xyz(Matrix.mul(this.getRotationMatrix(), Vector.vec(1.0, 0.0, 0.0, 0.0)));
    }

    update(key_states) {
        let local_dir = Vector.vec(0.0);
        if (key_states.w)
            local_dir = Vector.add(local_dir, Vector.vec(0.0, 1.0, 0.0));
        if (key_states.s)
            local_dir = Vector.add(local_dir, Vector.vec(0.0, -1.0, 0.0));
        if (key_states.a)
            local_dir = Vector.add(local_dir, Vector.vec(-1.0, 0.0, 0.0));
        if (key_states.d)
            local_dir = Vector.add(local_dir, Vector.vec(1.0, 0.0, 0.0));
        if (key_states.q)
            local_dir = Vector.add(local_dir, Vector.vec(0.0, 0.0, -1.0));
        if (key_states.e)
            local_dir = Vector.add(local_dir, Vector.vec(0.0, 0.0, 1.0));

        if (Vector.len(local_dir) > 0)
            this.move(Vector.norm(local_dir));
    }

    move(local_dir) {
        const temp = Matrix.rot(Matrix.mat(1.0), this.rotation.h, Vector.vec(0.0, 0.0, -1.0));
        const forward = Vector.xyz(Matrix.mul(temp, Vector.vec(0.0, 1.0, 0.0, 0.0)));
        const up = Vector.vec(0.0, 0.0, 1.0);
        const right = Vector.cross(forward, up);

        this.position = Vector.add(this.position, Vector.mul(forward, local_dir.y * this.speed), Vector.mul(right, local_dir.x * this.speed), Vector.mul(up, local_dir.z * this.speed));
    }

    rotate(dh, dv) {
        this.rotation.h += dh * this.sensitivity;
        this.rotation.v += dv * this.sensitivity;
        this.rotation.h = this.rotation.h % 360.0;
        if (this.rotation.v > 90)
            this.rotation.v = 90;
        if (this.rotation.v < -90)
            this.rotation.v = -90;
    }
}