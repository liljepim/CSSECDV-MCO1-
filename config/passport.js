const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const Admin = require('../models/Admin');
const Moderator = require('../models/Moderator');
const bcrypt = require('bcrypt');

const maxAttempts = 5;
const lockTime = 30 * 60 * 1000; // 30 minutes

// Helper function to check regular users
const checkRegularUser = (req, username, password, done) => {
    console.log(`[Login] Checking regular user: ${username}`);
    
    User.findOne({ userName: username })
        .then((user) => {
            if (!user) {
                console.log(`[Login] User not found: ${username}`);
                return done(null, false);
            }

            console.log(`[Login] Found user: ${user.userName}`);
            console.log(`[Login] Login attempts: ${user.loginAttempts}, Is locked: ${user.isLocked}`);

            if (user.isLocked && user.lockUntil > Date.now()) {
                const msLeft = user.lockUntil - Date.now();
                const minutes = Math.floor(msLeft / 60000);
                const seconds = Math.floor((msLeft % 60000) / 1000);
                console.log(`[Login] Account Lockout ${username}. Attempts: ${user.loginAttempts}`);
                req.session.lockInfo = { username, minutes, seconds };
                return done(null, false, {locked: true, minutes, seconds});
            }

            if (user.isLocked && user.lockUntil <= Date.now()) {
                user.isLocked = false;
                user.loginAttempts = 0;
                user.lockUntil = null;
                console.log(`[Login] Account unlocked: ${username}`);
            }

            bcrypt.compare(password, user.userPassword, (err, result) => {
                if (result) {
                    console.log(`[Login] Password correct for user: ${username}`);
                    user.loginAttempts = 0;
                    user.isLocked = false;
                    user.lockUntil = null;
                    return user.save().then(() => done(null, user));
                } else {
                    console.log(`[Login] Password incorrect for user: ${username}`);
                    user.loginAttempts += 1;
                    if (user.loginAttempts >= maxAttempts) {
                        user.isLocked = true;
                        user.lockUntil = Date.now() + lockTime;
                        console.log(`[Login] Account locked: ${username}`);
                    }

                    return user.save().then(() => done(null, false, { message: "Invalid password" }));
                }
            });
        })
        .catch((err) => {
            console.error(`[Login] Error checking user ${username}:`, err);
            done(err);
        });
};

// Helper function to check moderators
const checkModerator = (req, username, password, done) => {
    console.log(`[Login] Checking moderator: ${username}`);
    
    Moderator.findOne({ moderatorName: username })
        .then((moderator) => {
            if (!moderator) {
                console.log(`[Login] Moderator not found: ${username}`);
                return checkRegularUser(req, username, password, done);
            }

            console.log(`[Login] Found moderator: ${moderator.moderatorName}`);
            console.log(`[Login] Input password: "${password}", Stored password: "${moderator.moderatorPassword}"`);
            
            // Compare plain text passwords for moderators 
            if (password === moderator.moderatorPassword) {
                console.log(`[Login] Password correct for moderator: ${username}`);
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
                console.log(`[Login] Password incorrect for moderator: ${username}`);
                return checkRegularUser(req, username, password, done);
            }
        })
        .catch((err) => {
            console.error("[Login] Moderator check error:", err);
            return checkRegularUser(req, username, password, done);
        });
};

const verifyCallback = (req, username, password, done) => {
    console.log(`[Login] Attempt for username: ${username}`);
    
    // First check if it's an admin
    Admin.findOne({ adminName: username })
        .then((admin) => {
            if (admin) {
                console.log(`[Login] Found admin: ${admin.adminName}`);
                console.log(`[Login] Input password: "${password}", Stored password: "${admin.adminPassword}"`);
                
                // Compare plain text passwords for admins
                if (password === admin.adminPassword) {
                    console.log(`[Login] Password correct for admin: ${username}`);
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
                    console.log(`[Login] Password incorrect for admin: ${username}, checking moderator...`);
                    // password doesn't match for admin, check moderator
                    return checkModerator(req, username, password, done);
                }
            } else {
                console.log(`[Login] Not an admin, checking moderator...`);
                // not an admin check regular user through moderator check
                return checkModerator(req, username, password, done);
            }
        })
        .catch((err) => {
            console.error("[Login] Admin check error:", err);
            return checkModerator(req, username, password, done);
        });
};

const strategy = new LocalStrategy({ 
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true 
}, verifyCallback);

passport.use(strategy);

passport.serializeUser((user, done) => {
    console.log(`[Auth] Serializing user: ${user.userName}, Type: ${user.userType}`);
    const sessionUser = {
        id: user._id,
        isAdmin: user.isAdmin || false,
        isModerator: user.isModerator || false,
        userType: user.userType || 'user',
        userName: user.userName
    };
    done(null, sessionUser);
});

passport.deserializeUser((sessionUser, done) => {
    console.log(`[Auth] Deserializing user ID: ${sessionUser.id}, Type: ${sessionUser.userType}`);
    
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
                    console.log(`[Auth] Admin not found with ID: ${sessionUser.id}`);
                    done(null, false);
                }
            })
            .catch(err => {
                console.error(`[Auth] Error deserializing admin:`, err);
                done(err);
            });
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
                    console.log(`[Auth] Moderator not found with ID: ${sessionUser.id}`);
                    done(null, false);
                }
            })
            .catch(err => {
                console.error(`[Auth] Error deserializing moderator:`, err);
                done(err);
            });
    } else {
        User.findById(sessionUser.id)
            .then((user) => {
                if (user) {
                    console.log(`[Auth] Found user: ${user.userName}`);
                    done(null, user);
                } else {
                    console.log(`[Auth] User not found with ID: ${sessionUser.id}`);
                    done(null, false);
                }
            })
            .catch(err => {
                console.error(`[Auth] Error deserializing user:`, err);
                done(err);
            });
    }
});