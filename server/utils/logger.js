const { log } = require("../models/Logs")

async function logEvent({
    user_id=null,
    attempted_identifier=null,
    req=null,
    action,
    status,
    event_description,
    module=null,
    error_code=null,
    details={}
}) {
    try{
        const source_ip = req ? req.ip : null;
        const user_agent = req ? req.headers['user-agent'] : null

        await Log.create({
            user_id,
            attempted_identifier,
            source_ip,
            user_agent,
            action,
            status,
            event_description,
            module,
            error_code,
            details
        });
    } catch(err) {
        console.error("Failed to write log: ", err);
    }
}

module.exports = { logEvent }
