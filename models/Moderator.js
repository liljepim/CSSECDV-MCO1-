const mongoose = require('mongoose');

const ModeratorSchema = new mongoose.Schema({
    moderatorName: {
        type: String,
        required: true,
        unique: true
    },
    moderatorPassword: {
        type: String,
        required: true
    }
});

const Moderator = mongoose.model('Moderator', ModeratorSchema);

module.exports = Moderator;