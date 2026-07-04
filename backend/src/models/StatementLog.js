import mongoose from 'mongoose';

const statementLogSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  transactionsParsed: {
    type: Number,
    default: 0
  },
  talliedCount: {
    type: Number,
    default: 0
  },
  unreconciledCount: {
    type: Number,
    default: 0
  }
});

const StatementLog = mongoose.model('StatementLog', statementLogSchema);
export default StatementLog;
