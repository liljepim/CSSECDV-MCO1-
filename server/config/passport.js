const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const Admin = require('../models/Admin');
const Moderator = require('../models/Moderator'); // Add this line
const bcrypt = require('bcrypt');

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
                    return done(null, adminUser);
                } else {
                    // password doesn't match for admin, check moderator
                    return checkModerator(username, password, done);
                }
            } else {
                // not an admin, check moderator
                return checkModerator(username, password, done);
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
                    return done(null, modUser);
                } else {
                    // password doesn't match for moderator, check regular user
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

// helper function to check regular users (unchanged)
const checkRegularUser = (username, password, done) => {
    User.findOne({ userName: username })
        .then((user) => {
            if (!user) {
                return done(null, false);
            }

            bcrypt.compare(password, user.userPassword, (err, result) => {
                if (result) {
                    const regularUser = {
                        ...user._doc,
                        isAdmin: false,
                        isModerator: false,
                        userType: 'user'
                    };
                    return done(null, regularUser);
                } else {
                    return done(null, false);
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