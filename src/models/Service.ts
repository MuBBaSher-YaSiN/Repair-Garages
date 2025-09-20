// src/models/Service.ts
import mongoose, { Schema, models } from "mongoose";

export interface IService {
  key: string; // unique key like 'car-wash'
  name: string;
  category?: string;
  defaultPrice?: number | null; // null means no fixed price
  allowCustomPrice: boolean;
  isPackage?: boolean;
  packageItems?: mongoose.Types.ObjectId[]; // if package, list of service ids
}

const ServiceSchema = new Schema<IService>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String },
    defaultPrice: { type: Number, default: null },
    allowCustomPrice: { type: Boolean, default: true },
    isPackage: { type: Boolean, default: false },
    packageItems: [{ type: Schema.Types.ObjectId, ref: "Service" }],
  },
  { timestamps: true }
);

export const Service =
  (models.Service as mongoose.Model<IService>) ||
  mongoose.model<IService>("Service", ServiceSchema);
