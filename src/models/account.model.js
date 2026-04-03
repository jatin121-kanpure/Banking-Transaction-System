const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Account must be associated with a user"],
      index: true, // for faster queries on user field, since we will be frequently querying accounts based on user
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "FROZEN", "CLOSED"],
        message: "Status must be either ACTIVE, FROZEN or CLOSED",
      },
      default: "ACTIVE",
    },
    currency: {
      type: String,
      required: [true, "Currency is required for creating an account"],
      default: "INR",
    }, // balance nahi store karenge database mai it will be ledger based system, transactions ke basis pe balance calculate karenge
  },
  {
    timestamps: true,
  },
);

accountSchema.index({ user: 1, status: 1 }); // compound index for user and status, since we will be frequently querying accounts based on user and status

// A ledger is a single source of truth for all transactions and account balances.

accountSchema.methods.getBalance = async function () {
  // we use aggregate function to run custom query to calculate balance based on ledger entries for this account which will sum up all the credit entries and debit entries for this account and return the balance
  const balanceData = await ledgerModel.aggregate([
    { $match: { account: this._id } }, // match all ledger entries for this account
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ["$totalCredit", "$totalDebit"] }, // balance = totalCredit - totalDebit
      },
    },
  ]);

  if (balanceData.length === 0) {
    return 0; // if there are no ledger entries for this account, then balance is 0
  }
  return balanceData[0].balance; // return the calculated balance
};

const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;
