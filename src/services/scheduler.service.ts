import { envConfig } from '../config/env.config';
import { fetchAndSaveAirboxData } from './airbox-fetch.service';
import { checkThresholdsAndAlert } from './notification.service';

let scheduler: NodeJS.Timeout | null = null;
let isFetching = false;
let intervalMinutes = envConfig.fetchIntervalMinutes;

export function getIntervalMinutes() {
    return intervalMinutes;
}

export function setIntervalMinutes(minutes: number) {
    if (typeof minutes === 'number' && minutes > 0) {
        intervalMinutes = minutes;
        console.log(`Fetch interval updated to ${intervalMinutes} minutes`);
        scheduleNextFetch();
    } else {
        throw new Error('Invalid minutes value for setIntervalMinutes');
    }
}

export function clearScheduledFetch() {
    if (scheduler) {
        clearTimeout(scheduler);
        scheduler = null;
    }
}

function scheduleNextFetch(delayMinutes?: number) {
    clearScheduledFetch();
    const minutes = typeof delayMinutes === 'number' ? delayMinutes : intervalMinutes;
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

export async function startScheduler() {
    try {
        console.log('Running initial fetch at scheduler startup...');
        await fetchAndSaveAirboxData();
    } catch (err) {
        console.error('Initial fetch failed:', err);
    } finally {
        scheduleNextFetch();
    }
}
