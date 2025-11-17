
export class AirBoxEntity {
    status: string;
    entries: AirBoxEntryEntity[];
    exclusion: any | null;
    total: number;

    constructor(data: AirBoxEntity) {
        this.status = data.status;
        this.entries = data.entries;
        this.exclusion = data.exclusion;
        this.total = data.total;
    }
}

export class AirBoxEntryEntity {
    area: string;          // Usually empty
    co: number;            // Carbon monoxide (often 0)
    co2: number;           // CO₂ (often 0 for this model)
    name: string;          // Device name
    fw_ver: string;        // Firmware version
    lat: number;           // Latitude
    lon: number;           // Longitude
    h: number;             // Humidity
    hcho: number;          // Formaldehyde (often 0)
    mac: string;           // Device MAC
    model: string;         // Device model (sometimes empty)
    odm: string;           // Manufacturer (usually "edimax")
    pm1: number;           // PM1 level
    pm10: number;          // PM10 level
    pm25: number;          // PM2.5 level
    t: number;             // Temperature
    tvoc: number;          // Total VOC (often 0)
    type: string;          // "airbox"
    time: Date;          // ISO timestamp
    status: string;        // "online" or "offline"
    adf_status: number;    // Additional status flag (0 = OK)

    constructor(data: AirBoxEntryEntity) {
        this.area = data.area;
        this.co = data.co;
        this.co2 = data.co2;
        this.name = data.name;
        this.fw_ver = data.fw_ver;
        this.lat = data.lat;
        this.lon = data.lon;
        this.h = data.h;
        this.hcho = data.hcho;
        this.mac = data.mac;
        this.model = data.model;
        this.odm = data.odm;
        this.pm1 = data.pm1;
        this.pm10 = data.pm10;
        this.pm25 = data.pm25;
        this.t = data.t;
        this.tvoc = data.tvoc;
        this.type = data.type;
        this.time = data.time;
        this.status = data.status;
        this.adf_status = data.adf_status;
    }
}