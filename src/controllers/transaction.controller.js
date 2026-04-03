const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW
 * 1. Validate request data (fromAccount, toAccount, amount, idempotencyKey)
 * 2. Validate idempotencyKey to prevent duplicate transactions
 * 3. Check account status (active, not frozen) for both accounts
 * 4. Derive sender balance from ledger entries and check if sufficient funds are available
 * 5. Create a new transaction document with status PENDING
 * 6. Create Debit ledger entry for sender account
 * 7. Create credit ledger entry for receiver account
 * 8. Update transaction status to COMPLETED
 * 9.commit mongodb session to ensure atomicity of transaction and ledger entries
 * 10. Send Email Notification
 */

async function createTransaction(req, res) {
  /**
   * 1. Validate Request
   */
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  // If any of the required fields are missing, return a 400 Bad Request response
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  // Finding whether two accounts exist or not
  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });
  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!fromUserAccount || !toUserAccount) {
    return res
      .status(400)
      .json({ message: "Invalid fromAccount or toAccount" });
  }
  /**
   * 2. Validate Idempotency Key
   */
  const isTransactionAlreadyExits = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (isTransactionAlreadyExits) {
    if (isTransactionAlreadyExits.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: isTransactionAlreadyExits,
      });
    } else if (isTransactionAlreadyExits.status === "PENDING") {
      return res.status(200).json({
        message: "Transaction is being processed",
      });
    } else if (isTransactionAlreadyExits.status === "FAILED") {
      return res.status(500).json({
        message:
          "Transaction processing failed previously. Please try again later or contact support if the issue persists.",
      });
    } else if (isTransactionAlreadyExits.status === "REVERSED") {
      return res.status(500).json({
        message:
          "Transaction was reversed previously. Please try again later or contact support if the issue persists.",
      });
    }
  }

  /**
   * 3. Check Account Status
   */
  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message: "Both accounts must be active to initiate a transaction",
    });
  }

  /**
   * 4. Derive Sender Balance and Check Sufficient Funds
   */
  const balance = await fromUserAccount.getBalance();
  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`,
    });
  }
  let transaction;
  try {
    /**
     * 5. Create transaction (PENDING)
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = await transactionModel.create(
      [
        {
          fromAccount,
          toAccount,
          amount,
          idempotencyKey,
          status: "PENDING",
        },
      ],
      { session },
    );

    const debitLedgerEntry = await ledgerModel.create(
      ([
        {
          account: fromAccount,
          amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session }),
    )[0];
    // // Simulating a delay in transaction processing to test idempotency and concurrent transaction handling
    // await (() => {
    //   return new Promise((resolve) => setTimeout(resolve, 100 * 1000));
    // });

    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    // transaction.status = "COMPLETED";
    // await transaction.save({ session });
    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    return res.status(400).json({
      message:
        "Transction is Pending due to some issue, Please Retry after sometime",
    });
  }

  /**
   * 10. Send Email Notification
   */
  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.name,
    amount,
    fromUserAccount._id,
    toUserAccount._id,
  );
  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });
}

async function createInitialFundsTransaction(req, res) {
  /**
   * This function is used to create an initial funds transaction when a new account is created and initial deposit is made. This is a special type of transaction where the fromAccount is null and the toAccount is the newly created account. This function can only be called by an admin user and it does not require an idempotency key since it is not exposed as an API endpoint and it is only called internally by the system when a new account is created.
   */
  const { toAccount, amount, idempotencyKey } = req.body;
  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });
  if (!toUserAccount) {
    return res.status(400).json({ message: "Invalid toAccount" });
  }

  // if system account deleted so fallback for this
  const fromUserAccount = await accountModel.findOne({
    user: req.user._id,
  });
  if (!fromUserAccount) {
    return res.status(500).json({
      message: "System account not found for the user. Please contact support.",
    });
  }

  //Now initiating transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  //  we cannot create transaction directly in database we will create it on client side
  const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING",
  });

  const debitLedgerEntry = await ledgerModel.create(
    [
      {
        account: fromUserAccount._id,
        amount,
        transaction: transaction._id,
        type: "DEBIT",
      },
    ],
    { session },
  );
  const creditLedgerEntry = await ledgerModel.create(
    [
      {
        account: toAccount,
        amount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: transaction,
  });
}
module.exports = {
  createTransaction,
  createInitialFundsTransaction,
};
