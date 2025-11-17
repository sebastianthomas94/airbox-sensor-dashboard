import { envConfig } from '../config/env.config';
import { airboxRepository } from '../repositories/airbox.repository';
import { resend } from '../config/resend.config';

export type NotificationThresholds = {
    humidity?: number;
    temperature?: number;
    pm25?: number;
    email?: string;
};

// In-memory store for notification thresholds
let notificationThresholds: NotificationThresholds = {};

export function getNotificationThresholds() {
    return notificationThresholds;
}

export function setNotificationThresholds(updated: Partial<NotificationThresholds>) {
    notificationThresholds = { ...notificationThresholds, ...updated };
    return notificationThresholds;
}

export async function checkThresholdsAndAlert() {
    if (!notificationThresholds.email) return;

    try {
        const data = await airboxRepository.findAll();
        if (!data || data.length === 0) return;

        const latestByMac: { [mac: string]: any } = {};
        data.forEach((entry: any) => {
            if (!latestByMac[entry.mac] || new Date(entry.time) > new Date(latestByMac[entry.mac].time)) {
                latestByMac[entry.mac] = entry;
            }
        });

        const alerts: any[] = [];
        Object.values(latestByMac).forEach((reading: any) => {
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

        if (alerts.length > 0) {
            await sendAlertEmail(notificationThresholds.email!, alerts);
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
