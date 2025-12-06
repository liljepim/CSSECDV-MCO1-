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

    question1: {
        type: String,
        required: true
    },
    question2: {
        type: String,
        required: true
    },
    question3: {
        type: String,
        required: true
    },
    answer1: {
        type: String,
        required: true
    },
    answer2: {
        type: String,
        required: true
    },
    answer3: {
        type: String,
        required: true
    },
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
