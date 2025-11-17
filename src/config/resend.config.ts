import { Resend } from 'resend';
import { envConfig } from './env.config';

// Initialize and export a shared Resend client using environment configuration.
export const resend = new Resend(envConfig.resendApiKey);
