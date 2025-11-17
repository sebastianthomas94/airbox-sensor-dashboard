import { AirBoxEntryEntity } from "../entities/airbox.entity";
import { AirBoxEntryModel } from "../schemas/airbox.schema";

const toDomain = (doc: any): AirBoxEntryEntity => {
    return doc.toObject() as AirBoxEntryEntity;
};

export const airboxRepository = {
    async findAll(): Promise<AirBoxEntryEntity[]> {
        const entries = await AirBoxEntryModel.find().sort({ time: -1 }).exec();
        return entries.map(toDomain);
    },

    async create(entry: AirBoxEntryEntity): Promise<AirBoxEntryEntity> {
        const newEntry = new AirBoxEntryModel(entry);
        const savedEntry = await newEntry.save();
        return toDomain(savedEntry);
    }
}