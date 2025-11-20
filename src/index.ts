import express from 'express';
import path from 'path';
import { envConfig, validateEnv } from './config/env.config';
import { connectDB } from './config/db.config';
import { fetchAndSaveAirboxData } from './services/airbox-fetch.service';
import { notificationRouter } from './routes/notification.routes';
import { checkThresholdsAndAlert } from './services/notification.service';
import { dataRouter } from './routes/data.routes';
import { intervalRouter } from './routes/interval.routes';
import { startScheduler, setIntervalMinutes, clearScheduledFetch } from './services/scheduler.service';

let interval = envConfig.fetchIntervalMinutes; // minutes
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Mount routers
app.use('/', dataRouter);

// Interval router (we'll handle the actual interval change below when mounted)
app.use('/', intervalRouter);

// Ensure interval change actually updates our runtime interval and reschedules
app.post('/interval:set', (req, res) => {
    const { intervalMinutes } = req.body;
    try {
        setIntervalMinutes(intervalMinutes);
        res.json({ message: `Fetch interval updated to ${intervalMinutes} minutes` });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Invalid intervalMinutes value' });
    }
});

// Mount notification routes (GET/POST /set-notification-values)
app.use(notificationRouter);


// Scheduler moved to `src/services/scheduler.service.ts`.

const startServer = async () => {
    try {
        validateEnv();
        await connectDB();

        app.listen(envConfig.port, () => {
            console.log(`Server running on port ${envConfig.port}`);
        });

        // Start scheduler (runs an initial fetch and then schedules recurring runs)
        await startScheduler();
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown: clear timer so process can exit cleanly
process.on('SIGINT', () => {
    console.log('SIGINT received: clearing scheduler and exiting.');
    clearScheduledFetch();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received: clearing scheduler and exiting.');
    clearScheduledFetch();
    process.exit(0);
});