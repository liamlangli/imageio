export interface PackEnvLoad {
    source: string;
}

export interface PackEnvImage {
    file: string;
    width: number;
    height: number;

    sizeUncompressed?: number;
    sizeCompressed?: number;
    samples?: number;
    blur?: number;
}

export interface PackEnvTexture {
    images: PackEnvImage[];

    limitSize: number;
    encoding: "luv" | "rgbm" | "rgbe" | "float" | "rg16" | "srgb";
    type: "background" | "specular_ue4";
    format: "lut" | "cubemap" | "panorama";
}

export interface PackEnvConfig {
    textures: PackEnvTexture[];
    writeByChannel: boolean;
    diffuseSPH: number[];
}

async function fetch_array_buffer(source: string): Promise<ArrayBuffer> {
    return await((await fetch(source)).arrayBuffer());
}

async function fetch_string(source: string): Promise<string> {
    return await((await fetch(source)).text());
}

importScripts('../../gunzip.min.js');

function gunzip(buffer: ArrayBuffer): ArrayBuffer {
    const decoder = new (self as any).Zlib.Gunzip(new Uint8Array(buffer));
    const result = decoder.decompress();
    return result.buffer;
}

export interface PackEnvTextureData {
    width: number;
    height: number;
    encoding: "luv" | "rgbm" | "rgbe" | "float" | "rg16" | "srgb";
    data: Uint16Array | Uint8Array;
    mipmap?: Uint8Array[];
}

export interface PackEnvData {
    spherical_harmonics: number[];
    brdf_lut: PackEnvTextureData;
    radiance: PackEnvTextureData;
}

function get_directory(path: string): string {
    const parts = path.split('/');
    if (parts.length < 2) return "";
    parts.pop();
    return parts.join("/");
}

function parse_lut(pack: PackEnvData, texture: PackEnvTexture, buffer: ArrayBuffer) {
    const data = {} as PackEnvTextureData;
    const raw = gunzip(buffer);
    const image = texture.images[0];
    data.width = image.width;
    data.height = image.height;
    data.encoding = texture.encoding;
    data.data = texture.encoding === "rg16" ? new Uint16Array(raw) : new Uint8Array(raw);
    pack.brdf_lut = data;
}

function parse_radiance(pack: PackEnvData, texture: PackEnvTexture, buffer: ArrayBuffer) {
    const raw = gunzip(buffer);
    const data = {} as PackEnvTextureData;
    const image = texture.images[0];
    const max_level = Math.log(image.width) / Math.LN2;

    data.width = image.width;
    data.height = image.height;
    data.encoding = texture.encoding;
    let offset = 0;
    data.mipmap = [];
    for (let i = 0; i <= max_level; i++) {
        let size = Math.pow(2, max_level - i);
        let byte_size = 0;
        if (offset >= raw.byteLength) throw `invalid data offset ${offset}`;

        for (let face = 0; face < 6; ++face) {
            byte_size = size * size * 4;
            const mip_data = new Uint8Array(raw, offset, byte_size);
            data.mipmap.push(mip_data);
            offset += byte_size;
        }
    }
    pack.radiance = data;
}

self.onmessage = async (event: MessageEvent) => {
    const action = event.data as PackEnvLoad;
    const source = action.source;

    if (!source) throw `invalid request source ${source}`;
    const config = JSON.parse(await fetch_string(source)) as PackEnvConfig;

    const pack = {} as PackEnvData;
    pack.spherical_harmonics = config.diffuseSPH;

    const parent = get_directory(source);
    const pendings: Promise<any>[] = [];
    const buffers: ArrayBuffer[] = [];
    for (const texture of config.textures) {
        // if (texture.format == "lut") {
        //     pendings.push(fetch_array_buffer(parent + "/" + texture.images[0].file).then(buffer => {
        //         buffers.push(buffer);
        //         parse_lut(pack, texture, buffer);
        //     }));
        // }
        if (texture.format == "cubemap" && texture.encoding == "luv" && texture.type == "specular_ue4") {
            pendings.push(fetch_array_buffer(parent + "/" + texture.images[0].file).then(buffer => {
                buffers.push(buffer);
                parse_radiance(pack, texture, buffer);
            }));
        }
    }

    await Promise.all(pendings);
    postMessage(pack, buffers);
}