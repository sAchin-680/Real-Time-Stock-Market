import { Schema, model, models, type Document, type Model } from 'mongoose';

export type TransactionSide = 'BUY' | 'SELL' | 'DIVIDEND';

export interface TransactionDoc extends Document {
  userId: string;
  symbol: string;
  side: TransactionSide;
  quantity: number;
  price: number;
  fees: number;
  executedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<TransactionDoc>(
  {
    userId: { type: String, required: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    side: { type: String, enum: ['BUY', 'SELL', 'DIVIDEND'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    fees: { type: Number, default: 0, min: 0 },
    executedAt: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 280 },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, executedAt: -1 });
TransactionSchema.index({ userId: 1, symbol: 1 });

export const Transaction: Model<TransactionDoc> =
  (models?.Transaction as Model<TransactionDoc>) || model<TransactionDoc>('Transaction', TransactionSchema);
