import { Schema, model, models, type Document, type Model } from 'mongoose';
import type { AlertCondition, AlertFrequency } from '@/lib/finance/alerts';

export interface AlertTrigger {
  price: number;
  changePercent: number;
  triggeredAt: Date;
}

export interface AlertDoc extends Document {
  userId: string;
  symbol: string;
  company: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  frequency: AlertFrequency;
  active: boolean;
  lastTriggeredAt?: Date;
  lastTriggeredTradingDate?: string;
  triggerCount: number;
  history: AlertTrigger[];
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<AlertDoc>(
  {
    userId: { type: String, required: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    condition: { type: String, enum: ['PRICE_ABOVE', 'PRICE_BELOW', 'PCT_UP', 'PCT_DOWN'], required: true },
    threshold: { type: Number, required: true },
    frequency: { type: String, enum: ['ONCE', 'DAILY'], default: 'ONCE' },
    active: { type: Boolean, default: true },
    lastTriggeredAt: { type: Date },
    lastTriggeredTradingDate: { type: String },
    triggerCount: { type: Number, default: 0 },
    history: {
      type: [{ price: Number, changePercent: Number, triggeredAt: Date, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
);

AlertSchema.index({ userId: 1, createdAt: -1 });
AlertSchema.index({ active: 1, symbol: 1 });

export const PriceAlert: Model<AlertDoc> =
  (models?.PriceAlert as Model<AlertDoc>) || model<AlertDoc>('PriceAlert', AlertSchema, 'alerts');
