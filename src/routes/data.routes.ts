import express from 'express';
import { airboxRepository } from '../repositories/airbox.repository';
import { fetchAndSaveAirboxData } from '../services/airbox-fetch.service';

const router = express.Router();

router.get('/get-data', async (req, res) => {
    try {
        const data = await airboxRepository.findAll();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.get('/fetch-data', async (req, res) => {
    try {
        await fetchAndSaveAirboxData();
        res.json({ message: 'Data fetched and saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch and save data' });
    }
});

export const dataRouter = router;
