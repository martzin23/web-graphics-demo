export default class Vector {
    static vec(...args) {
        let result = {}
        const letters = "xyzw";
        args = args.flat();

        if (args === undefined || args === null)
            return {x: 0, y: 0, z: 0};
        else if (args.length > letters.length)
            throw new RangeError("Resulting vector is too big!");   
        else if (args.length == 1)
            result = {x: args[0], y: args[0], z: args[0]};
        else
            for (let i=0; i<args.length; i++)
                result[letters[i]] = args[i];

        return result;
    }

    static array(vec) {
        let array = [];
        for (const el in vec)
            array.push(vec[el]);
        return array;
    }

    static data(vec) {
        return Float32Array(Vector.array(vec));
    }

    // Not generic
    static test(vec) {
        return (
            vec !== null && typeof vec === 'object' &&
            'x' in vec && typeof vec.x === 'number' &&
            'y' in vec && typeof vec.y === 'number'
        );
    }

    // Not generic
    static xyz(vec) {
        return Vector.vec(vec.x, vec.y, vec.z);
    }

    // Not generic
    static xy(vec) {
        return Vector.vec(vec.x, vec.y);
    }

    // Not generic
    static add(...args) {
        let result = Vector.vec(0.0);
        for (let el of args) {
            if (Vector.test(el)) {
                result.x += el.x;
                result.y += el.y;
                result.z += el.z;
            }
            else {
                result.x += el;
                result.y += el;
                result.z += el;
            }
        }
        return result;
    }

    // Not generic
    static sub(first, ...second) {
        let result = first;
        for (let el of second) {
            if (Vector.test(el)) {
                result.x -= el.x;
                result.y -= el.y;
                result.z -= el.z;
            }
            else {
                result.x -= el;
                result.y -= el;
                result.z -= el;
            }
        }
        return result;
    }

    // Not generic
    static mul(first, second) {
        let result = first;
        if (Vector.test(second)) {
            result.x *= second.x;
            result.y *= second.y;
            result.z *= second.z;
        } else {
            result.x *= second;
            result.y *= second;
            result.z *= second;
        }
        return result;
    }

    // Not generic
    static div(first, second) {
        let result = first;
        if (Vector.test(second)) {
            result.x /= second.x;
            result.y /= second.y;
            result.z /= second.z;
        } else {
            result.x /= second;
            result.y /= second;
            result.z /= second;
        }
        return result;
    }

    static dot(first, second) {
        let result = 0;
        for (const el in first)
            result += first[el] * second[el];
        return result;
    }

    // Not generic
    static cross(first, second) {
        return Vector.vec(first.y * second.z - first.z * second.y, first.z * second.x - first.x * second.z, first.x * second.y - first.y * second.x);
    }

    static len(vec) {
        return Math.sqrt(Vector.dot(vec, vec));
    }

    static norm(vec) {
        if (vec.x == 0 && vec.y == 0 && vec.z == 0)
            return Vector.vec(0.0);
        else
            return Vector.div(vec, Vector.len(vec));
    }
}