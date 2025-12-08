const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  helpful: { type: Boolean, required: true },
});

const ReviewSchema = new mongoose.Schema({
  reviewID: { type: Number, required: true },
  userID: { type: Number, required: true },
  restoID: { type: Number, required: true },
  reviewTitle: { type: String, required: true },
  reviewContent: { type: String, required: true },
  reviewDate: { type: String, required: true },
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  responses: [
    {
      responseContent: { type: String, required: true },
      responseDate: { type: String, required: true },
      ownerID: { type: Number, required: true },
    }
  ],
  reviewRating: { type: String, enum: ['W', 'L', 'M'] },
  reviewImages: { type: String },
  interactions: [InteractionSchema],
  isEdited: { type: Boolean, default: false },
});

const Review = mongoose.model('Review', ReviewSchema);
module.exports = Review;