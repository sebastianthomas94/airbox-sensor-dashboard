import express from 'express';
import path from 'path';
import { Resend } from 'resend';
import { envConfig, validateEnv } from './config/env.config';
import { connectDB } from './config/db.config';
import { airboxRepository } from './repositories/airbox.repository';
import { fetchAndSaveAirboxData } from './services/airbox-fetch.service';

const resend = new Resend(envConfig.resendApiKey);

let interval = envConfig.fetchIntervalMinutes; // minutes
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/get-data', async (req, res) => {
    try {
        const data = await airboxRepository.findAll();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.get('/fetch-data', async (req, res) => {
    try {
        await fetchAndSaveAirboxData();
        res.json({
            message: "Data fetched and saved successfully",
            intervalMinutes: envConfig.fetchIntervalMinutes
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch and save data" });
    }
});

app.post('/interval:set', (req, res) => {
    const { intervalMinutes } = req.body;
    if (typeof intervalMinutes === 'number' && intervalMinutes > 0) {
        interval = intervalMinutes;
        console.log(`Fetch interval updated to ${interval} minutes`);
        // Reschedule the next run using the new interval
        scheduleNextFetch();
        res.json({ message: `Fetch interval updated to ${interval} minutes` });
    } else {
        res.status(400).json({ error: 'Invalid intervalMinutes value' });
    }
});

// In-memory store for notification thresholds
let notificationThresholds: {
    humidity?: number;
    temperature?: number;
    pm25?: number;
    email?: string;
} = {};

/**
 * GET /set-notification-values
 * Returns the currently configured notification thresholds
 */
app.get('/set-notification-values', (req, res) => {
    res.json({ thresholds: notificationThresholds });
});

/**
 * POST /set-notification-values
 * Body may contain: { humidity, temperature, pm25, email }
 */
app.post('/set-notification-values', (req, res) => {
    const { humidity, temperature, pm25, email } = req.body as any;

    // Validate provided fields
    const errors: string[] = [];
    if (humidity !== undefined && (typeof humidity !== 'number' || Number.isNaN(humidity))) {
        errors.push('humidity must be a number');
    }
    if (temperature !== undefined && (typeof temperature !== 'number' || Number.isNaN(temperature))) {
        errors.push('temperature must be a number');
    }
    if (pm25 !== undefined && (typeof pm25 !== 'number' || Number.isNaN(pm25))) {
        errors.push('pm25 must be a number');
    }
    if (email !== undefined && typeof email !== 'string') {
        errors.push('email must be a string');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Invalid payload', details: errors });
    }

    // Update only provided fields
    if (humidity !== undefined) notificationThresholds.humidity = humidity;
    if (temperature !== undefined) notificationThresholds.temperature = temperature;
    if (pm25 !== undefined) notificationThresholds.pm25 = pm25;
    if (email !== undefined) notificationThresholds.email = email;

    console.log('Notification thresholds updated:', notificationThresholds);
    res.json({ message: 'Notification thresholds updated', thresholds: notificationThresholds });
});


let scheduler: NodeJS.Timeout | null = null;
let isFetching = false;

// Helper function to check thresholds and send alerts
async function checkThresholdsAndAlert() {
    if (!notificationThresholds.email) {
        return; // No email configured
    }

    try {
        const data = await airboxRepository.findAll();
        if (!data || data.length === 0) return;

        // Get the latest reading per sensor
        const latestByMac: { [mac: string]: any } = {};
        data.forEach(entry => {
            if (!latestByMac[entry.mac] || new Date(entry.time) > new Date(latestByMac[entry.mac].time)) {
                latestByMac[entry.mac] = entry;
            }
        });

        const alerts: any[] = [];

        Object.values(latestByMac).forEach((reading: any) => {
            // Check humidity threshold
            if (notificationThresholds.humidity !== undefined && reading.h > notificationThresholds.humidity) {
                alerts.push({
                    sensorName: reading.name || 'Unknown',
                    mac: reading.mac,
                    thresholdType: 'Humidity',
                    thresholdValue: notificationThresholds.humidity,
                    actualValue: reading.h,
                    time: new Date(reading.time)
                });
            }

            // Check temperature threshold
            if (notificationThresholds.temperature !== undefined && reading.t > notificationThresholds.temperature) {
                alerts.push({
                    sensorName: reading.name || 'Unknown',
                    mac: reading.mac,
                    thresholdType: 'Temperature',
                    thresholdValue: notificationThresholds.temperature,
                    actualValue: reading.t,
                    time: new Date(reading.time)
                });
            }

            // Check PM2.5 threshold
            if (notificationThresholds.pm25 !== undefined && reading.pm25 > notificationThresholds.pm25) {
                alerts.push({
                    sensorName: reading.name || 'Unknown',
                    mac: reading.mac,
                    thresholdType: 'PM2.5',
                    thresholdValue: notificationThresholds.pm25,
                    actualValue: reading.pm25,
                    time: new Date(reading.time)
                });
            }
        });

        // Send email if there are alerts
        if (alerts.length > 0) {
            await sendAlertEmail(notificationThresholds.email, alerts);
        }
    } catch (error) {
        console.error('Error checking thresholds:', error);
    }
}

async function sendAlertEmail(toEmail: string, alerts: any[]) {
    if (!envConfig.resendApiKey) {
        console.warn('RESEND_API_KEY not configured, skipping email alert');
        return;
    }

    try {
        const alertsHtml = alerts.map(alert => `
            <div style="background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #333;">⚠️ ${alert.thresholdType.toUpperCase()} Alert</h3>
                <p style="margin: 5px 0;"><strong>Sensor:</strong> ${alert.sensorName} (${alert.mac})</p>
                <p style="margin: 5px 0;"><strong>Current Value:</strong> ${alert.actualValue.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Threshold:</strong> ${alert.thresholdValue}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${alert.time.toLocaleString()}</p>
            </div>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>AirBox Sensor Alert</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">🌡️ AirBox Sensor Alert</h1>
                    <p style="margin: 10px 0 0 0;">Threshold exceeded for ${alerts.length} metric${alerts.length > 1 ? 's' : ''}</p>
                </div>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px;">
                    ${alertsHtml}
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        This is an automated alert from your AirBox Sensor Dashboard.
                    </p>
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: envConfig.resendFromEmail,
            to: toEmail,
            subject: `🚨 AirBox Alert: ${alerts.length} Threshold${alerts.length > 1 ? 's' : ''} Exceeded`,
            html: htmlContent,
        });

        console.log(`✅ Alert email sent to ${toEmail} for ${alerts.length} threshold violation(s)`);
    } catch (error) {
        console.error('❌ Failed to send alert email:', error);
    }
}

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