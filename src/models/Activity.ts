// src/models/Activity.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivity extends Document {
  userAddress: string;
  transactionType: string;
  details: string;
  txHash?: string;
  isAutomated: boolean;
  timestamp: Date;
}

const ActivitySchema: Schema = new Schema({
  userAddress: { type: String, required: true, index: true },
  transactionType: { type: String, required: true },
  details: { type: String, required: true },
  txHash: { type: String },
  isAutomated: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const Activity: Model<IActivity> =
  mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity;