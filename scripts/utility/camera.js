import Vector from './vector.js';
import Matrix from './matrix.js';

export default class Camera {
    constructor(
        position = Vector.vec(4.0), 
        rotation = Vector.vec(-135.0, 35.0), 
        fov = 0.5, 
        speed = 0.05, 
        sensitivity = 0.1
    ) {
        this.position = position;
        this.rotation = rotation;
        this.fov = fov;
        this.speed = speed;
        this.sensitivity = sensitivity;
    }

    getRotationMatrix() {
        let result = Matrix.rotationMatrix(Vector.vec(0.0, 0.0, 1.0), Matrix.deg2rad(this.rotation.x));
        result = Matrix.rotate(result, Matrix.deg2rad(this.rotation.y), Vector.vec(1.0, 0.0, 0.0));
        return result;
    }

    getDirection() {
        return Matrix.xyz(Matrix.mul(this.getRotationMatrix(), Vector.vec(1.0, 0.0, 0.0, 0.0)));
    }

    updatePosition(key_states) {
        let local_direction = Vector.vec(0.0);
        if (key_states.w)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, 1.0, 0.0));
        if (key_states.s)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, -1.0, 0.0));
        if (key_states.a)
            local_direction = Vector.add(local_direction, Vector.vec(-1.0, 0.0, 0.0));
        if (key_states.d)
            local_direction = Vector.add(local_direction, Vector.vec(1.0, 0.0, 0.0));
        if (key_states.q)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, 0.0, -1.0));
        if (key_states.e)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, 0.0, 1.0));

        if (Vector.len(local_direction) > 0)
            this.move(Vector.norm(local_direction));
    }

    updateRotation(dh, dv) {
        this.rotation.x += dh * this.sensitivity;
        this.rotation.y += dv * this.sensitivity;
        this.rotation.x = this.rotation.x % 360.0;
        if (this.rotation.y > 90)
            this.rotation.y = 90;
        if (this.rotation.y < -90)
            this.rotation.y = -90;
    }

    move(local_direction) {
        const temp = Matrix.rotate(Matrix.mat(1.0), Matrix.deg2rad(this.rotation.x), Vector.vec(0.0, 0.0, -1.0));
        const forward = Vector.xyz(Matrix.mul(temp, Vector.vec(0.0, 1.0, 0.0, 0.0)));
        const up = Vector.vec(0.0, 0.0, 1.0);
        const right = Vector.cross(forward, up);

        this.position = Vector.add(
            this.position, 
            Vector.mul(forward, local_direction.y * this.speed), 
            Vector.mul(right, local_direction.x * this.speed), 
            Vector.mul(up, local_direction.z * this.speed)
        );
    }
}