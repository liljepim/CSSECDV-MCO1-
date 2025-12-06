const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const Admin = require('../models/Admin');
const Moderator = require('../models/Moderator'); // Add this line
const bcrypt = require('bcrypt');

const maxAttempts = 5;
const lockTime = 30 * 60 * 1000; // 30 minutes

const verifyCallback = (req, username, password, done) => {
    console.log(`Login attempt for username: ${username}`); // Debug log
    
    // First check if it's an admin
    Admin.findOne({ adminName: username })
        .then((admin) => {
            if (admin) {
                console.log(`Admin found: ${admin.adminName}`); // Debug log
                // admin login attempt
                if (password === admin.adminPassword) {
                    console.log(`Admin password matches for ${username}`); // Debug log
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
                    console.log(`Admin password mismatch for ${username}`); // Debug log
                    // password doesn't match for admin, check moderator
                    return checkModerator(username, password, done);
                }
            } else {
                console.log(`No admin found for ${username}, checking moderator...`); // Debug log
                // not an admin check moderator
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
            console.log(`Moderator check for ${username}:`, moderator ? 'Found' : 'Not found'); // Debug log
            if (moderator) {
                console.log(`Password comparison for moderator: input="${password}", stored="${moderator.moderatorPassword}"`); // Debug log
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
                    return checkRegularUser({}, username, password, done);
                }
            } else {
                console.log(`No moderator found with username ${username}, checking regular user...`); // Debug log
                // not a moderator, check regular user
                return checkRegularUser({}, username, password, done);
            }
        })
        .catch((err) => {
            console.error("Moderator check error:", err);
            return checkRegularUser({}, username, password, done);
        });
};

// helper function to check regular users
const checkRegularUser = (req, username, password, done) => {
    console.log(`Checking regular user: ${username}`); // Debug log
    User.findOne({ userName: username })
        .then((user) => {
            if (!user) {
                console.log(`No regular user found for ${username}`); // Debug log
                return done(null, false);
            }

            console.log(`Regular user found: ${user.userName}, login attempts: ${user.loginAttempts}`); // Debug log

            if (user.isLocked && user.lockUntil > Date.now()) {
                 const msLeft = user.lockUntil - Date.now();
                 const minutes = Math.floor(msLeft / 60000);
                 const seconds = Math.floor((msLeft % 60000) / 1000);
                console.log(`[Login] Account Lockout ${username}. Attempts: ${user.loginAttempts}`);
                if (req && req.session) {
                    req.session.lockInfo = { username, minutes, seconds };
                }
                return done(null, false, {locked: true, minutes, seconds});
            }

            if (user.isLocked && user.lockUntil <= Date.now()) {
                user.isLocked = false;
                user.loginAttempts = 0;
                user.lockUntil = null;
            }

            bcrypt.compare(password, user.userPassword, (err, result) => {
                if (err) {
                    console.error("bcrypt compare error:", err);
                    return done(err);
                }
                
                if (result) {
                      
                      user.loginAttempts = 0;
                      user.isLocked = false;
                      user.lockUntil = null;
                      return user.save().then(() => done(null, user));
                } else {
                    
                    user.loginAttempts += 1;
                    if (user.loginAttempts >= maxAttempts) {
                        user.isLocked = true;
                        user.lockUntil = Date.now() + lockTime;
                    }

                    return user.save().then(() => done(null, false, { message: "Invalid password" }));
                }
                
            });
  
        })
        
        .catch((err) => {
            console.error("Error checking regular user:", err);
            done(err);
        });

};

const strategy = new LocalStrategy({ passReqToCallback: true }, verifyCallback);

passport.use(strategy);

passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.userName}, type: ${user.userType}`); // Debug log
    const sessionUser = {
        id: user._id,
        isAdmin: user.isAdmin || false,
        isModerator: user.isModerator || false,
        userType: user.userType || 'user'
    };
    done(null, sessionUser);
});

passport.deserializeUser((sessionUser, done) => {
    console.log(`Deserializing user with type: ${sessionUser.userType}`); // Debug log
    
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
