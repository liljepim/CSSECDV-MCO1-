const {logEvent} = require("../utils/logger");

function requireRole(role) {
    return async (req, res, next) => {
        if(!req.user || req.user.role !== role) {
            await logEvent({
                req,
                user_id: req.user?._id || null,
                action: "authorization_failure",
                status: "blocked",
                event_description: "User lacks required role",
                module: "access_control",
            });

            return res.status(403).render('error', { css: ["notfound"], title: "Oh no something went wrong"})
        }
    }
}

module.exports = { requiredRole };
