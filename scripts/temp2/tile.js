// import * as Vector from '../utility/vector.js';

// const max_tiles = 4;
// const tile_size = 1.0;
// const tile_resolution = 1000;

// function getTileSetSize(min_x, min_y, max_x, max_y) {
//     const width_tiles = Math.ceil(max_x) - Math.floor(min_x);
//     const height_tiles = Math.ceil(max_y) - Math.floor(min_y);
//     return width_tiles * height_tiles;
// }

export function isValidTileSet(min_x, min_y, max_x, max_y) {
    const max_tiles = 1;
    if (Math.abs(min_x) > 180 || Math.abs(min_y) > 180 || Math.abs(max_x) > 180 || Math.abs(max_y) > 180)
        return false;

    const width_tiles = Math.ceil(max_x) - Math.floor(min_x);
    const height_tiles = Math.ceil(max_y) - Math.floor(min_y);
    return (width_tiles * height_tiles) <= max_tiles;
}

function getUrl(lat, lon) {
    const lat_hemisphere = lat >= 0 ? 'N' : 'S';
    const lon_hemisphere = lon >= 0 ? 'E' : 'W';
    
    const lat_tile = Math.abs(Math.floor(lat));
    const lon_tile = Math.abs(Math.floor(lon));

    const url = `https://s3.amazonaws.com/elevation-tiles-prod/skadi/${lat_hemisphere}${lat_tile.toString().padStart(2, '0')}/${lat_hemisphere}${lat_tile.toString().padStart(2, '0')}${lon_hemisphere}${lon_tile.toString().padStart(3, '0')}.hgt.gz`
    return url;
}

export async function fetchTile(lat, lon) {
    const url = getUrl(lat, lon);
    const compressed_data = await (await fetch(url)).arrayBuffer();
    const decompressed_data = pako.inflate(new Uint8Array(compressed_data));

    const dataView = new DataView(decompressed_data.buffer);
    const resolution = 1201; // SRTM-1 resolution
    const elevation_data = new Array(resolution);
    
    for (let row = 0; row < resolution; row++) {
        elevation_data[row] = new Array(resolution);
        for (let col = 0; col < resolution; col++) {
            const offset = (row * resolution + col) * 2;
            // Big-endian signed 16-bit integer
            elevation_data[row][col] = dataView.getInt16(offset, false);
        }
    }
    
    return {
        data: elevation_data,
        width: resolution,
        height: resolution,
    };
}

export function formatTile(data) {
    let image = new Uint8Array(data.width * data.height * 4);
    // let image = new ImageData(array, data.width, data.height, undefined);

    for (let x = 0; x < data.width; x++) {
        for (let y = 0; y < data.height; y++) {
            const offset = (x * data.width + y) * 4;
            const raw_height = data.data[x][y];
            const height = (raw_height + 32768);
            if (height == -32768)
                height = 0;
            image[offset] = height / (256.0);
            image[offset + 1] = height % (256.0);
            image[offset + 2] = height % (256.0 * 256.0);
            image[offset + 3] = 255;
        }
    }

    return {
        data: image,
        width: data.width,
        height: data.height,
    };
}

async function getTileSet(min_x, min_y, max_x, max_y) {
    if (!isValidTileSet(min_x, min_y, max_x, max_y))
        throw Error("Invalid coordinates or maximum ammount of tiles exceeded!");

    tiles = [];
    for (let x = Math.floor(min_x); x <= Math.ceil(max_x); x++) {
        tile_column = [];
        for (let y = Math.floor(min_y); y <= Math.ceil(max_y); y++) {
            const tile = formatTile(await fetchTile(x, y));
            tile_column.append(tile);
        }
        tiles.append(tile_column);
    }
    return tiles;
}

function cropImage(tiles, min_x, min_y, max_x, max_y) {
    // return image;
}

function analyzeImage(image) {
    // return {
    //     min: 1,
    //     max: 1,
    // };
}

export async function getData(min_x, min_y, max_x, max_y) {
    const tiles = await getTileSet(min_x, min_y, max_x, max_y);
    const image = cropImage(tiles, min_x, min_y, max_x, max_y);
    const data = analyzeImage(image);

    return {
        image: image,
        min: data.min,
        max: data.max,
        horizontal_scaling: 1,
        vertical_scaling: 1,
    }
}

// console.log(await fetchTile(27.9881, 86.9253));