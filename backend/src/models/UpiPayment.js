import mongoose from 'mongoose';

const upiPaymentSchema = new mongoose.Schema({
  salesman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'upi'],
    required: true
  },
  utr: {
    type: String,
    sparse: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        if (this.paymentMode === 'upi' && !/^\d{5}$/.test(v)) {
          return false;
        }
        return true;
      },
      message: props => `${props.value} is not a valid 5-digit UPI UTR snippet!`
    }
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'unreconciled', 'missing', 'mistake'],
    default: 'pending'
  },
  isSubmittedToOwner: {
    type: Boolean,
    default: false
  },
  isArchivedByOwner: {
    type: Boolean,
    default: false
  },
  isDeepArchivedByOwner: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  actualBankAmount: {
    type: Number
  },
  verifiedAt: {
    type: Date
  },
  statementRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StatementLog'
  }
}, { timestamps: true });

const UpiPayment = mongoose.model('UpiPayment', upiPaymentSchema);
export default UpiPayment;
