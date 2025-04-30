const jwt = require("jsonwebtoken");
const User = require("../models/Usermodel");
const Account = require("../models/Accountmodel");
const Transaction = require("../models/Transactionmodel");
const mongoose = require("mongoose");

module.exports = async (req, res) => {
  try {
    // 1. Authentication & Authorization
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate("accounts");
    const userId = decoded.id
    
    

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // req validation
    const { fromAccount, toAccount, amount, description } = req.body;

    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields: fromAccount, toAccount, amount",
      });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({
        status: "fail",
        message: "Cannot transfer to the same account",
      });
    }

    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        status: "fail",
        message: "Amount must be a positive number",
      });
    }

    //Start database transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate account objects contain accountNumber
      const fromAccountNumber =
        typeof fromAccount === "string"
          ? fromAccount
          : fromAccount?.accountNumber;

      const toAccountNumber =
        typeof toAccount === "string" ? toAccount : toAccount?.accountNumber;

      if (!fromAccountNumber || !toAccountNumber) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        return res.status(400).json({
          status: "fail",
          message:
            "Account must be specified by accountNumber (string or object)",
        });
      }

      // Proceed with fromAccountNumber/toAccountNumber
      const senderAccount = await Account.findOne({
        $or: [
          { accountNumber: fromAccountNumber },
          { _id: mongoose.Types.ObjectId.isValid(fromAccountNumber) ? fromAccountNumber : null }
        ]
      }).session(session);
      // Find accounts by accountNumber
      // const senderAccount = await Account.findOne({
      //   accountNumber: fromAccount.accountNumber,
      // }).session(session);

      const recipientAccount = await Account.findOne({
        accountNumber: toAccountNumber,
      }).session(session);
      
      

      if (!senderAccount || !recipientAccount) {
        await session.abortTransaction();
        return res.status(404).json({
          status: "fail",
          message: "One or both accounts not found",
        });
      }

      

      if (!senderAccount) {
        await session.abortTransaction();
        return res.status(404).json({
          status: "fail",
          message: "Sender account not found",
          details: {
            accountReference: fromAccountNumber
          }
        });
      }
      
      if (!senderAccount.userId) {
        await session.abortTransaction();
        return res.status(403).json({
          status: "fail",
          message: "Sender account has no owner assigned",
          details: {
            accountNumber: senderAccount.accountNumber,
            solution: "Please contact support to resolve this account ownership issue"
          }
        });
      }
  

      const transferAmount = Number(amount);
      if (senderAccount.balance < transferAmount) {
        await session.abortTransaction();
        return res.status(400).json({
          status: "fail",
          message: "Insufficient funds",
          availableBalance: senderAccount.balance,
        });
      }

      // make a  Transfer
      senderAccount.balance -= transferAmount;
      recipientAccount.balance += transferAmount;

      // Calculate total balance for user's accounts
      const userAccounts = await Account.find({ userId: decoded.id }).session(session);
      const totalBalance = userAccounts.reduce((sum, account) => sum + account.balance, 0);

      const transfer = new Transaction({
        fromAccount: senderAccount._id,  
        toAccount: recipientAccount._id, 
        fromAccountNumber: fromAccountNumber, 
        toAccountNumber: toAccountNumber,
        amount: transferAmount,
        description: description || `Transfer to ${recipientAccount.accountNumber.slice(-4)}`,
        type: "transfer",
        status: "completed",
        user: decoded.id,
      });

      // Save all changes
      await senderAccount.save({ session });
      await recipientAccount.save({ session });
      await transfer.save({ session });
      await session.commitTransaction();

      // Format response with updated balances
      const updatedUser = await User.findById(decoded.id)
        .populate({
          path: 'accounts',
          populate: {
            path: 'transactions',
            options: { sort: { date: -1 }, limit: 5 }
          }
        });
      
      const updatedTotalBalance = updatedUser.accounts.reduce((sum, account) => sum + account.balance, 0);
      console.log(updatedUser)
      res.status(201).json({
        status: "success",
        message: "Transfer completed successfully", 
        data: {
          transferId: transfer._id,
          fromAccount: senderAccount.accountNumber.slice(-4),
          toAccount: recipientAccount.accountNumber.slice(-4),
          amount: transferAmount,
          balances: {
            sender: senderAccount.balance,
            recipient: recipientAccount.balance,
            total: updatedTotalBalance
          },
          dashboardData: {
            accounts: updatedUser.accounts.map(acc => ({
              id: acc._id,
              balance: acc.balance,
              number: acc.accountNumber.slice(-4)
            })),
            totalBalance: updatedTotalBalance
          },
          timestamp: transfer.createdAt,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Transaction error:", error);
      return res.status(500).json({
        status: "error",
        message: "Transaction failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Transfer error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: "fail",
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Transfer failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};