const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: String,
      default: null,
      trim: true,
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    browser: {
      type: String,
      default: '',
      trim: true,
    },
    os: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    ip: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    entryPage: {
      type: String,
      default: '',
      trim: true,
    },
    exitPage: {
      type: String,
      default: '',
      trim: true,
    },
    pageViews: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    isBounce: {
      type: Boolean,
      default: false,
    },
    trafficSource: {
      type: String,
      enum: ['organic', 'direct', 'referral', 'social', 'unknown'],
      default: 'unknown',
    },
    startDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ startDate: -1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;