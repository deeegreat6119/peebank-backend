const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const UserSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: [true, 'First name is required']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    accounts: [{
      type: { type: String, enum: ['checking'], default: 'checking' },
      balance: { type: Number, default: 0 },
      accountNumber: { 
        type: String, 
        unique: true,
        required: true,
        default: function() {
          return Math.floor(1000000000 + Math.random() * 9000000000)
        },
        createdAt: { type: Date, default: Date.now }
      }
    }],
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    security: {
      twoFactorAuth: { type: Boolean, default: false },
      biometricLogin: { type: Boolean, default: false }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
});

// UserSchema.pre('save', async function(next) {
//     ('Pre-save hook triggered for user:', {
//         email: this.email,
//         isModifiedPassword: this.isModified('password')
//     });
    
//     if (this.isModified('password')) {
//         this.password = await bcrypt.hash(this.password, 10);
//     }
//     next();
// });

// UserSchema.methods.comparePassword = async function(candidatePassword) {
//     return await bcrypt.compare(candidatePassword, this.password);
// };

const User = mongoose.model('User', UserSchema);
module.exports = User;
