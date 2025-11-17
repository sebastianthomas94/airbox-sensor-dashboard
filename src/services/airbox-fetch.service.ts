import axios from "axios";
import { envConfig } from "../config/env.config";
import { AirBoxEntryEntity, AirBoxEntity } from "../entities/airbox.entity";
import { airboxRepository } from "../repositories/airbox.repository";

export async function fetchAndSaveAirboxData(): Promise<void> {
    try {
        const response = await axios.get(`${envConfig.airboxUrl}?token=${envConfig.airboxToken}`);
        const data = response.data as AirBoxEntity | any;

        // Basic shape check
        if (!data || !Array.isArray(data.entries)) {
            console.warn("Unexpected airbox response shape:", data);
            return;
        }

        // Map and validate entries
        const mappedEntries: AirBoxEntryEntity[] = data.entries
            .map((e: any) => {
                // Convert time string to Date if present
                const timeVal = e && e.time ? new Date(e.time) : undefined;

                const mapped: AirBoxEntryEntity = {
                    area: e?.area ?? '',
                    co: Number(e?.co ?? 0),
                    co2: Number(e?.co2 ?? 0),
                    name: e?.name ?? '',
                    fw_ver: e?.fw_ver ?? '',
                    lat: e?.lat ?? 0,
                    lon: e?.lon ?? 0,
                    h: Number(e?.h ?? 0),
                    hcho: Number(e?.hcho ?? 0),
                    mac: e?.mac ?? '',
                    model: e?.model ?? '',
                    odm: e?.odm ?? '',
                    pm1: Number(e?.pm1 ?? 0),
                    pm10: Number(e?.pm10 ?? 0),
                    pm25: Number(e?.pm25 ?? 0),
                    t: Number(e?.t ?? 0),
                    tvoc: Number(e?.tvoc ?? 0),
                    type: e?.type ?? 'airbox',
                    time: timeVal as any, // entity expects Date
                    status: e?.status ?? 'offline',
                    adf_status: Number(e?.adf_status ?? 0),
                };
                return mapped;
            })
            // Keep only entries that have required fields: mac and time
            .filter((entry) => {
                const ok = !!entry.mac && entry.time instanceof Date && !isNaN(entry.time.getTime());
                if (!ok) {
                    console.warn("Skipping entry missing required fields (mac/time):", entry);
                }
                return ok;
            });

        if (mappedEntries.length === 0) {
            console.warn("No valid airbox entries to save.");
            return;
        }

        // Save all entries concurrently but don't fail the whole batch if one fails
        const results = await Promise.allSettled(
            mappedEntries.map((entry) => airboxRepository.create(entry))
        );

        const failures = results
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => r.status === "rejected")
            .map(({ r, i }) => ({ index: i, reason: (r as PromiseRejectedResult).reason }));

        if (failures.length > 0) {
            console.error("Some entries failed to save:", failures);
        } else {
            console.log(`Successfully fetched and saved ${mappedEntries.length} airbox entries`);
        }
    } catch (error) {
        console.error("Error fetching airbox data:", error);
        throw error;
    }
}