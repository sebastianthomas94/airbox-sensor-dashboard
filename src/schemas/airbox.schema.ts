import mongoose, { Schema, Model } from 'mongoose';
import { AirBoxEntryEntity, AirBoxEntity } from '../entities/airbox.entity';

/**
 * Entry schema
 */
export const AirBoxEntrySchema: Schema = new Schema<AirBoxEntryEntity>(
    {
        area: { type: String, default: '' },
        co: { type: Number, default: 0 },
        co2: { type: Number, default: 0 },
        name: { type: String, default: '' },
        fw_ver: { type: String, default: '' },
        lat: { type: Number, default: 0 },
        lon: { type: Number, default: 0 },
        h: { type: Number, default: 0 },        // humidity
        hcho: { type: Number, default: 0 },
        mac: { type: String, required: true, index: true },
        model: { type: String, default: '' },
        odm: { type: String, default: '' },
        pm1: { type: Number, default: 0 },
        pm10: { type: Number, default: 0 },
        pm25: { type: Number, default: 0 },
        t: { type: Number, default: 0 },        // temperature
        tvoc: { type: Number, default: 0 },
        type: { type: String, default: 'airbox' },
        time: { type: Date, required: true },   // stored as Date
        status: { type: String, enum: ['online', 'offline'], default: 'offline' },
        adf_status: { type: Number, default: 0 },
    },
    {
        timestamps: false,
    }
);

/**
 * Response schema that holds an array of entries
 */
export const AirBoxResponseSchema: Schema = new Schema<AirBoxEntity>(
    {
        status: { type: String, required: true },
        entries: { type: [AirBoxEntrySchema], default: [] },
        exclusion: { type: Schema.Types.Mixed, default: null },
        total: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

/**
 * Models
 * - AirBoxEntryModel can be used standalone if you persist entries as top-level docs.
 * - AirBoxResponseModel is useful if you store the API response objects.
 *
 * If you only store entries, you can drop AirBoxResponseModel and use AirBoxEntryModel instead.
 */
export const AirBoxEntryModel: Model<AirBoxEntryEntity> =
    mongoose.models.AirBoxEntry || mongoose.model<AirBoxEntryEntity>('AirBoxEntry', AirBoxEntrySchema);

export const AirBoxResponseModel: Model<AirBoxEntity> =
    mongoose.models.AirBoxResponse || mongoose.model<AirBoxEntity>('AirBoxResponse', AirBoxResponseSchema);

export type AirboxDoc = mongoose.Document & AirBoxEntryEntity;