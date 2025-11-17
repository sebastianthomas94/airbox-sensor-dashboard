import express from 'express';

const router = express.Router();

router.post('/interval:set', (req, res) => {
    const { intervalMinutes } = req.body;
    if (typeof intervalMinutes === 'number' && intervalMinutes > 0) {
        // We'll attach a setter to app in index.ts; here just forward the payload
        // The actual interval change is handled where the router is mounted.
        res.json({ message: 'Interval change request received', intervalMinutes });
    } else {
        res.status(400).json({ error: 'Invalid intervalMinutes value' });
    }
});

export const intervalRouter = router;
