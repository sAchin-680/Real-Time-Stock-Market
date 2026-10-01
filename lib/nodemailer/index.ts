import nodemailer, { type SendMailOptions } from 'nodemailer';
import {
    NEWS_SUMMARY_EMAIL_TEMPLATE,
    STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
    STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
    WELCOME_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";
import { isEmailConfigured } from "@/lib/env";
import { describeAlert, type AlertCondition } from "@/lib/finance/alerts";
import { formatCurrency } from "@/lib/format";
import { logger } from "@/lib/logger";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
    },
});

const fromName = () => process.env.EMAIL_FROM_NAME || 'Tickline';
const from = (suffix = '') => `"${fromName()}${suffix}" <${process.env.NODEMAILER_EMAIL}>`;

/** Absolute app URL with trailing slash, used for links in emails. */
export const appUrl = () => {
    const base = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    return base.endsWith('/') ? base : `${base}/`;
};

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Fills {{placeholders}}. Plain values are HTML-escaped; `html` values are
 * inserted verbatim and must come from trusted sources.
 */
export function renderTemplate(template: string, values: Record<string, string>, html: Record<string, string> = {}) {
    let out = template.replaceAll('{{appUrl}}', appUrl());
    for (const [key, value] of Object.entries(values)) out = out.replaceAll(`{{${key}}}`, escapeHtml(value));
    for (const [key, value] of Object.entries(html)) out = out.replaceAll(`{{${key}}}`, value);
    return out;
}

async function send(options: SendMailOptions) {
    if (!isEmailConfigured()) {
        logger.warn('email.skipped_not_configured', { subject: options.subject });
        return false;
    }
    await transporter.sendMail(options);
    return true;
}

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    return send({
        from: from(),
        to: email,
        subject: `Welcome to ${fromName()} - your stock market toolkit is ready!`,
        text: `Thanks for joining ${fromName()}`,
        html: renderTemplate(WELCOME_EMAIL_TEMPLATE, { name }, { intro }),
    });
};

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
) => {
    return send({
        from: from(' News'),
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from ${fromName()}`,
        html: renderTemplate(NEWS_SUMMARY_EMAIL_TEMPLATE, { date }, { newsContent }),
    });
};

export const sendPriceAlertEmail = async ({
    email,
    symbol,
    company,
    condition,
    threshold,
    price,
}: {
    email: string;
    symbol: string;
    company: string;
    condition: AlertCondition;
    threshold: number;
    price: number;
}) => {
    const upward = condition === 'PRICE_ABOVE' || condition === 'PCT_UP';
    const target = condition.startsWith('PRICE') ? formatCurrency(threshold) : describeAlert(condition, threshold);
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET';

    return send({
        from: from(' Alerts'),
        to: email,
        subject: `🔔 ${symbol} alert: ${describeAlert(condition, threshold)} (now ${formatCurrency(price)})`,
        text: `${symbol} (${company}) triggered your alert: ${describeAlert(condition, threshold)}. Current price ${formatCurrency(price)}.`,
        html: renderTemplate(upward ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE : STOCK_ALERT_LOWER_EMAIL_TEMPLATE, {
            symbol,
            company,
            currentPrice: formatCurrency(price),
            targetPrice: target,
            timestamp,
        }),
    });
};
