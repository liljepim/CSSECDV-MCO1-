const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const Admin = require('../models/Admin');
const Moderator = require('../models/Moderator'); // Add this line
const { logEvent } = require("../utils/logger");

const bcrypt = require('bcrypt');

const maxAttempts = 5;
const lockTime = 30 * 60 * 1000; // 30 minutes

const verifyCallback = (req, username, password, done) => {
    // First check if it's an admin
    Admin.findOne({ adminName: username })
        .then((admin) => {
            if (admin) {
                // admin login attempt
                if (password === admin.adminPassword) {
                    const adminUser = {
                        ...admin._doc,
                        isAdmin: true,
                        isModerator: false,
                        userID: admin._id,
                        userName: admin.adminName,
                        userType: 'admin'
                    };
                    logEvent({
                        req,
                        user_id: admin._id,
                        action: "authentication_attempt",
                        status: "success",
                        event_description: "Admin login successful",
                        module: "passport_local",
                    }).catch(err => console.error("Logging error: ", err));
                    return done(null, adminUser);
                } else {
                    // password doesn't match for admin, check moderator
                    logEvent({
                        req,
                        attempted_identifier: username,
                        action: "authentication_attempt",
                        status: "failure",
                        event_description: "Admin login failed (wrong password)",
                        module: "passport_local",
                    }).catch(err => console.error("Logging error: ", err));
                    return checkModerator(username, password, done);
                }
            } else {
                // not an admin check regular user
                return checkRegularUser(req, username, password, done);
            }
        })
        .catch((err) => {
            console.error("Admin check error:", err);
            return checkModerator(username, password, done);
        });
};

// helper function to check moderators
const checkModerator = (username, password, done) => {
    Moderator.findOne({ moderatorName: username })
        .then((moderator) => {
            if (moderator) {
                // moderator login attempt
                if (password === moderator.moderatorPassword) {
                    const modUser = {
                        ...moderator._doc,
                        isAdmin: false,
                        isModerator: true,
                        userID: moderator._id,
                        userName: moderator.moderatorName,
                        userType: 'moderator'
                    };
                    logEvent({
                        req,
                        user_id: moderator._id,
                        action: "authentication_attempt",
                        status: "success",
                        event_description: "Moderator login successful",
                        module: "passport_local",
                    }).catch(err => console.error("Logging error: ", err));
                    return done(null, modUser);
                } else {
                    // password doesn't match for moderator, check regular user
                    logEvent({
                        req,
                        attempted_identifier: username,
                        action: "authentication_attempt",
                        status: "failure",
                        event_description: "Moderator login failed (wrong password)",
                        module: "passport_local",
                    }).catch(err => console.error("Logging error: ", err));
                    return checkRegularUser(username, password, done);
                }
            } else {
                // not a moderator, check regular user
                return checkRegularUser(username, password, done);
            }
        })
        .catch((err) => {
            console.error("Moderator check error:", err);
            return checkRegularUser(username, password, done);
        });
};

// helper function to check regular users
const checkRegularUser = (req, username, password, done) => {
    User.findOne({ userName: username })
        .then((user) => {
            if (!user) {
                return done(null, false);
            }

            if (user.isLocked && user.lockUntil > Date.now()) {
                 const msLeft = user.lockUntil - Date.now();
                 const minutes = Math.floor(msLeft / 60000);
                 const seconds = Math.floor((msLeft % 60000) / 1000);
                console.log(`[Login] Account Lockout ${username}. Attempts: ${user.loginAttempts}`);
                req.session.lockInfo = { username, minutes, seconds };
                logEvent({
                    req,
                    user_id: user._id,
                    action: "authentication_lockout",
                    status: "locked_out",
                    event_description: "User attempted login but is locked",
                    module: "passport_local"
                }).catch(err => console.error("Logging error: ", err));
                return done(null, false, {locked: true, minutes, seconds});
            }

            if (user.isLocked && user.lockUntil <= Date.now()) {
                user.isLocked = false;
                user.loginAttempts = 0;
                user.lockUntil = null;
                
            }

            bcrypt.compare(password, user.userPassword, (err, result) => {
                if (result) {
                    user.loginAttempts = 0;
                    user.isLocked = false;
                    user.lockUntil = null;
                    user.loginHistory.push({ date: new Date(), status: 'Successful' });
                    logEvent({
                        req,
                        user_id: user._id,
                        action: "authentication_attempt",
                        status: "success",
                        event_description: "User login successful",
                        module: "passport_local"
                    }).catch(err => console.error("Logging error: ", err));
                    return user.save().then(() => done(null, user));
                } else {
                    user.loginAttempts += 1;
                    if (user.loginAttempts >= maxAttempts) {
                        user.isLocked = true;
                        user.lockUntil = Date.now() + lockTime;
                        logEvent({
                            req,
                            user_id: user._id,
                            action: "authentication_lockout",
                            status: "locked_out",
                            event_description: "User account locked out",
                            module: "passport_local"
                        }).catch(err => console.error("Logging error: ", err));
                    }

                    user.loginHistory.push({ date: new Date(), status: 'Failed' });
                    logEvent({
                        req,
                        user_id: user._id,
                        action: "authentication_attempt",
                        status: "failure",
                        event_description: "Password mismatch",
                        module: "passport_local"
                    }).catch(err => console.error("Logging error: ", err));

                    return user.save().then(() => done(null, false, { message: "Invalid password" }));
                }
                
            });
  
        })
        
        .catch((err) => {
            done(err);
        });

};

const strategy = new LocalStrategy({ passReqToCallback: true }, verifyCallback);

passport.use(strategy);

passport.serializeUser((user, done) => {
    const sessionUser = {
        id: user._id,
        isAdmin: user.isAdmin || false,
        isModerator: user.isModerator || false,
        userType: user.userType || 'user'
    };
    done(null, sessionUser);
});

passport.deserializeUser((sessionUser, done) => {
    if (sessionUser.userType === 'admin') {
        Admin.findById(sessionUser.id)
            .then((admin) => {
                if (admin) {
                    const adminUser = {
                        ...admin._doc,
                        isAdmin: true,
                        isModerator: false,
                        userID: admin._id,
                        userName: admin.adminName,
                        userType: 'admin'
                    };
                    done(null, adminUser);
                } else {
                    done(null, false);
                }
            })
            .catch(err => done(err));
    } else if (sessionUser.userType === 'moderator') {
        Moderator.findById(sessionUser.id)
            .then((moderator) => {
                if (moderator) {
                    const modUser = {
                        ...moderator._doc,
                        isAdmin: false,
                        isModerator: true,
                        userID: moderator._id,
                        userName: moderator.moderatorName,
                        userType: 'moderator'
                    };
                    done(null, modUser);
                } else {
                    done(null, false);
                }
            })
            .catch(err => done(err));
    } else {
        User.findById(sessionUser.id)
            .then((user) => {
                done(null, user);
            })
            .catch(err => done(err));
    }
});
