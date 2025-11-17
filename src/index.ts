import express from 'express';
import path from 'path';
import { envConfig, validateEnv } from './config/env.config';
import { connectDB } from './config/db.config';
import { airboxRepository } from './repositories/airbox.repository';
import { fetchAndSaveAirboxData } from './services/airbox-fetch.service';
import { notificationRouter } from './routes/notification.routes';
import { checkThresholdsAndAlert } from './services/notification.service';
import { dataRouter } from './routes/data.routes';
import { intervalRouter } from './routes/interval.routes';

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
    if (typeof intervalMinutes === 'number' && intervalMinutes > 0) {
        interval = intervalMinutes;
        console.log(`Fetch interval updated to ${interval} minutes`);
        scheduleNextFetch();
        res.json({ message: `Fetch interval updated to ${interval} minutes` });
    } else {
        res.status(400).json({ error: 'Invalid intervalMinutes value' });
    }
});

// Mount notification routes (GET/POST /set-notification-values)
app.use(notificationRouter);


let scheduler: NodeJS.Timeout | null = null;
let isFetching = false;

function clearScheduledFetch() {
    if (scheduler) {
        clearTimeout(scheduler);
        scheduler = null;
    }
}


function scheduleNextFetch(delayMinutes?: number) {
    clearScheduledFetch();
    const minutes = typeof delayMinutes === 'number' ? delayMinutes : interval;
    const delayMs = Math.max(1, minutes) * 60 * 1000; // enforce at least 1 minute
    scheduler = setTimeout(async () => {
        if (isFetching) {
            console.log('Previous fetch still running, skipping this cycle and rescheduling.');
            scheduleNextFetch(); // reschedule using current interval
            return;
        }
        isFetching = true;
        try {
            await fetchAndSaveAirboxData();
            // Check thresholds after fetching new data
            await checkThresholdsAndAlert();
        } catch (err) {
            console.error('Error during scheduled data fetch:', err);
        } finally {
            isFetching = false;
            // Schedule the next run using the current interval
            scheduleNextFetch();
        }
    }, delayMs);
}

const startServer = async () => {
    try {
        validateEnv();
        await connectDB();

        app.listen(envConfig.port, () => {
            console.log(`Server running on port ${envConfig.port}`);
        });

        // Optional: run one immediate fetch at startup, then schedule the recurring fetches
        (async () => {
            try {
                console.log('Running initial fetch at startup...');
                await fetchAndSaveAirboxData();
            } catch (err) {
                console.error('Initial fetch failed:', err);
            } finally {
                // Start recurring scheduling after initial run
                scheduleNextFetch();
            }
        })();
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