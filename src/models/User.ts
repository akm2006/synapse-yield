// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  address: string;
  delegation?: any; // We'll store the signed delegation here later
}

const UserSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true, index: true },
  delegation: { type: Object },
});

// Prevent model overwrite on hot reloads
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;