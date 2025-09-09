import Vector from './vector.js'

export default class Matrix {
    static mat(s = 1.0) {
        return [
            [s, 0, 0, 0],
            [0, s, 0, 0],
            [0, 0, s, 0],
            [0, 0, 0, s]
        ]
    }

    static test(mat) {
        let test = (Array.isArray(mat) && mat.length == 4);
        if (!test)
            return test;
        for (const row of mat) {
            if (row.length != 4) {
                test = false;
                break;
            }
        }
        return test;
    }

    static array(mat) {
        return mat.flat();
    }

    static data(mat) {
        return Float32Array(Matrix.array(mat));
    }

    static deg2rad(deg) {
        const pi = 3.14;
        return deg * pi / 180;
    }

    static rad2deg(rad) {
        const pi = 3.14;
        return rad * 180 / pi;
    }

    static makeRotationMatrix(axis, rad) {
        let c = Math.cos(rad);
        let s = Math.sin(rad);
        let t = 1.0 - c;

        axis = Vector.norm(axis);
        let x = axis.x;
        let y = axis.y;
        let z = axis.z;
        
        return [
            [t*x*x + c,   t*x*y - s*z, t*x*z + s*y, 0.0],
            [t*x*y + s*z, t*y*y + c,   t*y*z - s*x, 0.0],
            [t*x*z - s*y, t*y*z + s*x, t*z*z + c,   0.0],
            [0.0,         0.0,         0.0,         1.0]
        ]
    }

    static rot(mat, deg, axis) {
        return Matrix.mul(Matrix.makeRotationMatrix(axis, Matrix.deg2rad(deg)), mat);
    }

    static trans(mat) {
        return [
            [mat[0][0], mat[1][0], mat[2][0], mat[3][0]],
            [mat[0][1], mat[1][1], mat[2][1], mat[3][1]],
            [mat[0][2], mat[1][2], mat[2][2], mat[3][2]],
            [mat[0][3], mat[1][3], mat[2][3], mat[3][3]]
        ]
    }

    static mul(a, b) {
        if (Vector.test(b))
            return Vector.vec(
                a[0][0] * b.x + a[0][1] * b.y + a[0][2] * b.z + a[0][3] * b.w,
                a[1][0] * b.x + a[1][1] * b.y + a[1][2] * b.z + a[1][3] * b.w,
                a[2][0] * b.x + a[2][1] * b.y + a[2][2] * b.z + a[2][3] * b.w,
                a[3][0] * b.x + a[3][1] * b.y + a[3][2] * b.z + a[3][3] * b.w
            );
        else
            return [
                [a[0][0]*b[0][0] + a[0][1]*b[1][0] + a[0][2]*b[2][0] + a[0][3]*b[3][0],
                a[0][0]*b[0][1] + a[0][1]*b[1][1] + a[0][2]*b[2][1] + a[0][3]*b[3][1],
                a[0][0]*b[0][2] + a[0][1]*b[1][2] + a[0][2]*b[2][2] + a[0][3]*b[3][2],
                a[0][0]*b[0][3] + a[0][1]*b[1][3] + a[0][2]*b[2][3] + a[0][3]*b[3][3]],
                
                [a[1][0]*b[0][0] + a[1][1]*b[1][0] + a[1][2]*b[2][0] + a[1][3]*b[3][0],
                a[1][0]*b[0][1] + a[1][1]*b[1][1] + a[1][2]*b[2][1] + a[1][3]*b[3][1],
                a[1][0]*b[0][2] + a[1][1]*b[1][2] + a[1][2]*b[2][2] + a[1][3]*b[3][2],
                a[1][0]*b[0][3] + a[1][1]*b[1][3] + a[1][2]*b[2][3] + a[1][3]*b[3][3]],
                
                [a[2][0]*b[0][0] + a[2][1]*b[1][0] + a[2][2]*b[2][0] + a[2][3]*b[3][0],
                a[2][0]*b[0][1] + a[2][1]*b[1][1] + a[2][2]*b[2][1] + a[2][3]*b[3][1],
                a[2][0]*b[0][2] + a[2][1]*b[1][2] + a[2][2]*b[2][2] + a[2][3]*b[3][2],
                a[2][0]*b[0][3] + a[2][1]*b[1][3] + a[2][2]*b[2][3] + a[2][3]*b[3][3]],
                
                [a[3][0]*b[0][0] + a[3][1]*b[1][0] + a[3][2]*b[2][0] + a[3][3]*b[3][0],
                a[3][0]*b[0][1] + a[3][1]*b[1][1] + a[3][2]*b[2][1] + a[3][3]*b[3][1],
                a[3][0]*b[0][2] + a[3][1]*b[1][2] + a[3][2]*b[2][2] + a[3][3]*b[3][2],
                a[3][0]*b[0][3] + a[3][1]*b[1][3] + a[3][2]*b[2][3] + a[3][3]*b[3][3]]
            ];
    }   

    static rot2dir(horizontal, vertical) {
        let temp = Matrix.mat();
        temp = Matrix.rot(temp, vertical, Vector.vec(1.0, 0.0, 0.0));
        temp = Matrix.rot(temp, horizontal, Vector.vec(0.0, 0.0, 1.0));
        return Vector.xyz(Matrix.mul(temp, Vector.vec(0.0, 1.0, 0.0, 0.0)));
    }
}