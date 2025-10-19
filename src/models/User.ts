import mongoose, { Schema, Document, Model } from 'mongoose';
import { Delegation } from '@metamask/delegation-toolkit';
export interface IUser extends Document {
  address: string;
  delegation?: Delegation;
  automationEnabled: boolean; // Add this new field
}

const UserSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true, index: true },
  delegation: { type: Object },
  // Define the new field with a default value of false
  automationEnabled: { type: Boolean, default: false },
});

// Prevent model overwrite on hot reloads
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;