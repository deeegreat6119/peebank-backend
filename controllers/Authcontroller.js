const User = require("../models/Usermodel");
const Account = require("../models/Accountmodel")
const Transaction = require("../models/Transactionmodel")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { promisify } = require('util');
const mongoose = require('mongoose');
// const express = require('express');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.Signup = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!firstName) missingFields.push("firstName");
    if (!lastName) missingFields.push("lastName");
    if (!email) missingFields.push("email");
    if (!phone) missingFields.push("phone");
    if (!password) missingFields.push("password");

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "fail",
        message: "User already exists with this email",
      });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate account number first
    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Create user with the account embedded
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      accounts: [{
        type: 'checking',
        balance: 300.00,
        accountNumber,
        createdAt: new Date()
      }]
    });

    // Also create separate Account document
    const checkingAccount = new Account({
      userId: newUser._id,  // Use newUser._id instead of User._id
      type: 'checking',
      balance: 300.00,
      accountNumber
    });

    await checkingAccount.save();

    const token = signToken(newUser._id);
    newUser.password = undefined;

    res.status(201).json({
      status: "success",
      token,
      data: {
        user: newUser,
        account: checkingAccount
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    
    // Handle duplicate account number error specifically
    if (error.code === 11000 && error.keyPattern && error.keyPattern['accounts.accountNumber']) {
      return res.status(400).json({
        status: "fail",
        message: "Account number conflict. Please try again.",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

exports.Signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "No account found with this email",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect password",
      });
    }

    const token = signToken(user._id);
    user.password = undefined;

    return res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

exports.DashBoard = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "No token provided"
      });
    }

    // Verify token
    const verifyingtoken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data with accounts and transactions
    const user = await User.findById(verifyingtoken.id)
      .populate({
        path: 'accounts',
        options: { session: null, new: true }, // Force fresh read
        populate: {
          path: 'transactions',
          options: { sort: { date: -1 }, limit: 5 }
        }
      });
    
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found"
      });
    }

    // Calculate total balance with detailed logging
    const totalBalance = user.accounts.reduce((sum, account) => {
      console.log(`Account ${account._id} balance:`, account.balance);
      return sum + account.balance;
    }, 0);
    console.log('Total calculated balance:', totalBalance);
    
    // console.log('Database account balances:', accounts.map(a => ({
    //   id: a._id,
    //   number: a.accountNumber,
    //   balance: a.balance
    // })));
    console.log(user.accounts);
    
    // Format data for frontend
    const accounts = user.accounts.map(account => ({
      id: account._id,
      name: account.name || `${account.type.charAt(0).toUpperCase() + account.type.slice(1)} Account`,
      balance: account.balance,
      number: account.accountNumber, // Show only last 4 digits
      type: account.type,
      available: account.balance, // Always use current balance
      interestRate: account.interestRate || 0
    }));
    console.log('Formatted accounts:', accounts);

    // Get recent transactions from all accounts
    const recentTransactions = user.accounts
      .flatMap(account => account.transactions || [])
      .filter(transaction => transaction && transaction._id) // Filter out undefined/null transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(transaction => ({
        id: transaction._id,
        date: transaction.date,
        description: transaction.description || 'N/A',
        category: transaction.category || 'Other',
        type: transaction.type || 'transaction',
        amount: transaction.amount || 0,
        status: transaction.status || 'completed',
        merchant: transaction.merchant || 'Unknown',
        account: transaction.account 
          ? `${accounts.find(a => a.id === transaction.account)?.name || 'Account'} •••• ${transaction.account.slice(-4)}`
          : 'Unknown Account'
      }));

    // Ensure we have valid data before sending response
    if (!user || !user._id) {
      return res.status(404).json({
        status: "fail",
        message: "User data not found"
      });
    }

    const responseData = {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar || getInitials(user.firstName, user.lastName)
      },
      accounts: accounts || [],
      recentTransactions: recentTransactions || [],
      stats: {
        totalBalance: totalBalance || 0,
        lastLogin: user.lastLogin || null,
        accountsCount: (user.accounts && user.accounts.length) || 0
      }
    };

    return res.status(200).json({
      status: "success",
      message: "Dashboard data retrieved successfully",
      data: responseData
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: "fail",
        message: "Invalid token"
      });
    }
    return res.status(500).json({
      status: "error",
      message: "Failed to load dashboard data"
    });
  }
};

// Helper function for avatar initials
function getInitials(firstName, lastName) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

exports.verifyUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    res.status(200).json({
      status: "success",
      message: "User has been verified successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    // Send reset password email here
    res.status(200).json({
      status: "success",
      message: "Reset password email has been sent successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    user.password = req.body.password;
    await user.save();
    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in! Please log in to get access",
      });
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: "fail",
        message: "The user belonging to this token no longer exists",
      });
    }

    // Attach complete user document to request
    req.user = currentUser;
    next();
  } catch (err) {
    console.error('Protect middleware error:', err);
    res.status(401).json({
      status: "fail",
      message: "Invalid or expired token",
    });
  }
};

exports.getsetting = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('firstName lastName email phone address notifications security');
    
    if (!user) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        notifications: user.notifications || {
          email: true,
          sms: false,
          push: true
        },
        security: user.security || {
          twoFactorAuth: false,
          biometricLogin: false
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch settings' 
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        firstName, 
        lastName, 
        phone, 
        // address 
      },
      { new: true, runValidators: true }
    ).select('firstName lastName email phone address');

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update profile' 
    });
  }
}


// Additional Controller Methods
exports.getTransferHistory = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ status: "fail", message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { page = 1, limit = 10, accountId } = req.query;
    const skip = (page - 1) * limit;

    const filter = { user: decoded.id, type: 'transfer' };
    if (accountId) filter.$or = [{ fromAccount: accountId }, { toAccount: accountId }];

    const transfers = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('fromAccount toAccount', 'accountNumber name');

    const total = await Transaction.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      results: transfers.length,
      total,
      data: transfers.map(t => ({
        id: t._id,
        date: t.createdAt,
        from: t.fromAccount.accountNumber.slice(-4),
        to: t.toAccount.accountNumber.slice(-4),
        amount: t.amount,
        description: t.description,
        status: t.status
      }))
    });

  } catch (error) {
    console.error("Transfer history error:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch transfers" 
    });
  }
};
