import mongoose from 'mongoose';

const verifiedUtrSchema = new mongoose.Schema({
  utrSnippet: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{5}$/.test(v);
      },
      message: props => `${props.value} is not a valid 5-digit UTR snippet!`
    }
  },
  amount: {
    type: Number,
    required: true
  },
  statementDate: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 8 * 24 * 60 * 60 // 8 days in seconds
  }
});

const VerifiedUtr = mongoose.model('VerifiedUtr', verifiedUtrSchema);
export default VerifiedUtr;
