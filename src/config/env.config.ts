import dotenv from 'dotenv';

dotenv.config();

export const envConfig = {
    mongodbUri: process.env.MONGODB_URI || '',
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    airboxUrl: process.env.AIRBOX_URL || '',
    airboxToken: process.env.AIRBOX_TOKEN || '',
    fetchIntervalMinutes: parseInt(process.env.FETCH_INTERVAL_MINUTES || '1', 10),
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
};

export const validateEnv = (): void => {
    if (!envConfig.mongodbUri) {
        throw new Error('MONGODB_URI is required in .env file');
    }
    if (!envConfig.airboxUrl) {
        throw new Error('AIRBOX_URL is required in .env file');
    }
    if (!envConfig.airboxToken) {
        throw new Error('AIRBOX_TOKEN is required in .env file');
    }
};
