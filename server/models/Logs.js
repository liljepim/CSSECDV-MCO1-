const mongoose = require('mongoose')

const LogsSchema = new mongoose.Schema(
    {
        timestamp: {
            type: Date,
            default: Date.now,
            index:true
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        attempted_identifier: {
            type: String,
            default: null
        },
        source_ip: {
            type: String,
            default: null
        },
        user_agent: {
            type: String,
            default: null
        },
        action: {
            type: String,
            required: true,
            enum: [
                "input_validation_failure",
                "authentication_attempt",
                "authentication_lockout",
                "authorization_failure",
                "access_denied"
            ]
        },
        event_description: {
            type: String,
            required: true
        },
        module: {
            type: String,
            default: null
        },
        status: {
            type: String,
            required: true,
            enum: [
                "success",
                "failure",
                "blocked",
                "locked-out"
            ]
        },
        error_code: {
            type: String,
            default: null
        },
    }
)

module.exports = mongoose.model("Log", LogsSchema)
