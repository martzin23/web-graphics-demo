import Vector from './vector.js';
import Matrix from './matrix.js';
import * as TouchListener from './touch.js';

export default class Camera {
    constructor(
        canvas,
        position = Vector.vec(0.0), 
        rotation = Vector.vec(0.0, 0.0), 
        fov = 0.5, 
        speed = 0.05, 
        sensitivity = 0.2
    ) {
        this.position = position;
        this.rotation = rotation;
        this.fov = fov;
        this.speed = speed;
        this.sensitivity = sensitivity;
        this.key_states = {};
        
        document.addEventListener('keydown', (event) => {
            if (event.key == 'w' || event.key == 'a' || event.key == 's' || event.key == 'd' || event.key == 'q' || event.key == 'e')
                this.key_states[event.key] = true;
        });
        document.addEventListener('keyup', (event) => {
            if (event.key == 'w' || event.key == 'a' || event.key == 's' || event.key == 'd' || event.key == 'q' || event.key == 'e')
                this.key_states[event.key] = false;
        });
        document.addEventListener('mousemove', (event) => {
            if (this.isEnabled()) {
                this.rotation.x += event.movementX * this.sensitivity * Math.min(this.fov, 1.0);
                this.rotation.y += event.movementY * this.sensitivity * Math.min(this.fov, 1.0);
                this.rotation.x = this.rotation.x % 360.0;
                if (this.rotation.y > 90)
                    this.rotation.y = 90;
                if (this.rotation.y < -90)
                    this.rotation.y = -90;
            }
        });
        TouchListener.addTouchListener(canvas, (event) => {
            this.rotation.x -= event.deltaX * this.sensitivity * Math.min(this.fov, 1.0);
            this.rotation.y -= event.deltaY * this.sensitivity * Math.min(this.fov, 1.0);
            this.rotation.x = this.rotation.x % 360.0;
            if (this.rotation.y > 90)
                this.rotation.y = 90;
            if (this.rotation.y < -90)
                this.rotation.y = -90;

            if (event.deltaZ != 0) {
                this.position = Vector.add(
                    this.position, 
                    Vector.mul(Matrix.rot2dir(this.rotation.x, -this.rotation.y), this.speed * event.deltaZ)
                );
            }
        });
        document.addEventListener('wheel', (event) => {
            if (this.isEnabled()) {
                if(event.deltaY < 0)
                    this.speed *= 1.25;
                else
                    this.speed /= 1.25;
            }
        });
    }

    getRotationMatrix() {
        let temp = Matrix.rotationMatrix(Vector.vec(0.0, 0.0, 1.0), Matrix.deg2rad(this.rotation.x));
        temp = Matrix.rotate(temp, Matrix.deg2rad(this.rotation.y), Vector.vec(1.0, 0.0, 0.0));
        return temp;
    }

    update() {
        if (this.isEnabled())
            this.updatePosition();
    }

    updatePosition() {
        let local_direction = Vector.vec(0.0);
        if (!!this.key_states.w)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, 1.0, 0.0));
        if (!!this.key_states.s)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, -1.0, 0.0));
        if (!!this.key_states.a)
            local_direction = Vector.add(local_direction, Vector.vec(-1.0, 0.0, 0.0));
        if (!!this.key_states.d)
            local_direction = Vector.add(local_direction, Vector.vec(1.0, 0.0, 0.0));
        if (!!this.key_states.q)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, 0.0, -1.0));
        if (!!this.key_states.e)
            local_direction = Vector.add(local_direction, Vector.vec(0.0, 0.0, 1.0));

        if (Vector.len(local_direction) == 0)
            return;

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

    toggle(canvas) {
        if (this.isEnabled())
            document.exitPointerLock();
        else
            canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {});
    }

    enable(canvas) {
        canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {});
    }

    disable() {
        document.exitPointerLock();
    }

    isEnabled() {
        return document.pointerLockElement !== null;
    }
}