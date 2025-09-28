    
export function vec(...args) {
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

export function array(v) {
    return Object.values(v);
}

export function data(v) {
    return Float32Array(array(v));
}

export function test(v) {
    return (
        v !== null && typeof v === 'object' &&
        'x' in v && typeof v.x === 'number' &&
        'y' in v && typeof v.y === 'number'
    );
}

export function xyz(v) {
    return vec(v.x, v.y, v.z);
}

export function xy(v) {
    return vec(v.x, v.y);
}

export function dot(first, second) {
    let result = 0;
    for (const el in first)
        result += first[el] * second[el];
    return result;
}

export function len(v) {
    return Math.sqrt(dot(v, v));
}

export function norm(v) {
    if (v.x == 0 && v.y == 0 && v.z == 0)
        return vec(0.0);
    else
        return div(v, len(v));
}

export function add(...args) {
    let result = vec(0.0);
    for (let el of args) {
        if (test(el)) {
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

export function sub(first, ...second) {
    let result = first;
    for (let el of second) {
        if (test(el)) {
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

export function mul(first, second) {
    let result = first;
    if (test(second)) {
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

export function div(first, second) {
    let result = first;
    if (test(second)) {
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

export function cross(first, second) {
    return vec(first.y * second.z - first.z * second.y, first.z * second.x - first.x * second.z, first.x * second.y - first.y * second.x);
}