import express from 'express';
import { getNotificationThresholds, setNotificationThresholds, NotificationThresholds } from '../services/notification.service';

const router = express.Router();

router.get('/set-notification-values', (req, res) => {
    res.json({ thresholds: getNotificationThresholds() });
});

router.post('/set-notification-values', (req, res) => {
    const { humidity, temperature, pm25, email } = req.body as Partial<NotificationThresholds>;
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

    if (errors.length > 0) return res.status(400).json({ error: 'Invalid payload', details: errors });

    const updated = setNotificationThresholds({ humidity, temperature, pm25, email });
    res.json({ message: 'Notification thresholds updated', thresholds: updated });
});

export const notificationRouter = router;
