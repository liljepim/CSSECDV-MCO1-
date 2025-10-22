const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    expires: {
        type: Date,
    },
    session: {
        type: String,
        required: true
    }
});

const Sessions = mongoose.model('Sessions', SessionSchema);

// async function checkSessions (){
//     const allSessions = await Sessions.find({})
//     console.log(allSessions)
// }

module.exports = Sessions;
