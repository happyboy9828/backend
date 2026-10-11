const mongoose = require('mongoose');

const pageVisitSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    referrer: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    ip: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: '',
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
    sessionId: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      default: null,
      trim: true,
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
    isReturning: {
      type: Boolean,
      default: false,
    },
    trafficSource: {
      type: String,
      enum: ['organic', 'direct', 'referral', 'social', 'unknown'],
      default: 'unknown',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pageVisitSchema.index({ sessionId: 1 });
pageVisitSchema.index({ timestamp: -1 });
pageVisitSchema.index({ page: 1 });
pageVisitSchema.index({ device: 1 });
pageVisitSchema.index({ country: 1 });
pageVisitSchema.index({ trafficSource: 1 });

const PageVisit = mongoose.model('PageVisit', pageVisitSchema);

module.exports = PageVisit;