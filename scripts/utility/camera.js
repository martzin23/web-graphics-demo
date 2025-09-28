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
        sensitivity = 0.2,
        free_mode = false,
        orbit_mode = false,
        orbit_anchor = Vector.vec(0.0, 0.0, 0.0)
    ) {
        this.position = position;
        this.rotation = rotation;
        this.fov = fov;
        this.speed = speed;
        this.sensitivity = sensitivity;

        this.free_mode = free_mode;
        this.orbit_mode = orbit_mode;
        this.orbit_anchor = orbit_anchor;
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
                if (this.orbit_mode)
                    this.updateOrbit(event.movementX, event.movementY);
                else
                    this.updateRotation(event.movementX, event.movementY);
            }
        });
        TouchListener.addTouchListener(canvas, (event) => {
            if (this.isOrbiting()) 
                this.updateOrbit(event.drag_x, event.drag_y);
            else
                this.updateRotation(-event.drag_x, -event.drag_y);

            if (event.zoom != 0)
                this.position = Vector.add(this.position, Vector.mul(Matrix.rot2dir(this.rotation.x, -this.rotation.y), this.speed * event.zoom));
        });
        document.addEventListener('wheel', (event) => {
            if (this.isEnabled()) {
                if (this.isOrbiting()) {
                    let delta;
                    if(event.deltaY < 0)
                        delta = 1.0 / 1.1;
                    else
                        delta = 1.1;
                    this.updateOrbit(0.0, 0.0, delta);
                } else {
                    if(event.deltaY < 0)
                        this.speed *= 1.25;
                    else
                        this.speed /= 1.25;
                }
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


        if (!this.isOrbiting()) {
            let forward, up, right;

            if (!this.free_mode) {
                const temp = Matrix.rotate(Matrix.mat(1.0), Matrix.deg2rad(this.rotation.x), Vector.vec(0.0, 0.0, -1.0));
                forward = Vector.xyz(Matrix.mul(temp, Vector.vec(0.0, 1.0, 0.0, 0.0)));
                up = Vector.vec(0.0, 0.0, 1.0);
                right = Vector.cross(forward, up);
            } else {
                forward = Matrix.rot2dir(this.rotation.x, -this.rotation.y);
                up = Matrix.rot2dir(this.rotation.x, -this.rotation.y + 90);
                right = Vector.cross(forward, up);
            }

            this.position = Vector.add(
                this.position, 
                Vector.mul(forward, local_direction.y * this.speed), 
                Vector.mul(right, local_direction.x * this.speed), 
                Vector.mul(up, local_direction.z * this.speed)
            );
        } else {
            this.updateOrbit(-local_direction.x / this.sensitivity * this.speed, local_direction.z / this.sensitivity * this.speed, 1.0 + -0.003 / this.sensitivity * this.speed * local_direction.y);
        }

    }

    updateRotation(dh, dv) {
        this.rotation.x += dh * this.sensitivity * Math.min(this.fov, 1.0);
        this.rotation.y += dv * this.sensitivity * Math.min(this.fov, 1.0);
        this.rotation.x = this.rotation.x % 360.0;
        this.rotation.y = Math.max(Math.min(this.rotation.y, 90), -90);
    }

    updateOrbit(dh = 0.0, dv = 0.0, dz = 1.0) {
        const radius = Vector.len(Vector.sub(this.position, this.orbit_anchor)) * dz;
        this.updateRotation(dh, dv);
        this.position = Vector.add(Vector.mul(Matrix.rot2dir(this.rotation.x, -this.rotation.y), -radius), this.orbit_anchor);
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

    isOrbiting() {
        return this.orbit_mode;
    }
}