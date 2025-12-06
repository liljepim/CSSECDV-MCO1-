const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userID: {
        type: Number,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userPassword: {
        type: String,
        required: true
    },
    userDesc: String,
    userImage: String,
    isEstablishmentOwner: {
        type: Boolean,
        default: false
    },
    establishmentID: {
        type: Number,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockUntil: {
        type: Date,
        default: null
    }

});

const User = mongoose.model('User', UserSchema);

module.exports = User;
