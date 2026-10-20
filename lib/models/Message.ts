import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessageAttachment {
  name: string;
  url: string;
  sizeKB?: number;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  channel: "internal" | "client" | "vendor"; // FR-70, FR-71 Strict Channel Boundaries
  senderUserId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  attachments: IMessageAttachment[];
  parentId?: mongoose.Types.ObjectId; // Threaded messaging
  isPinned: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    channel: {
      type: String,
      enum: ["internal", "client", "vendor"],
      required: true,
      index: true,
    },
    senderUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    senderAvatar: { type: String, default: "" },
    content: { type: String, required: true, trim: true },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        sizeKB: { type: Number, default: 0 },
      },
    ],
    parentId: { type: Schema.Types.ObjectId, ref: "Message" },
    isPinned: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ organizationId: 1, eventId: 1, channel: 1, createdAt: 1 });

export const MessageModel: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
