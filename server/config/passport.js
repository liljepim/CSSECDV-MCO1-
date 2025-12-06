const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

const maxAttempts = 5;
const lockTime = 30 * 60 * 1000; // 30 minutes

const verifyCallback = (req, username, password, done) => {
    // check if it's an admin
    Admin.findOne({ adminName: username })
        .then((admin) => {
            if (admin) {
                // admin login attempt
                if (password === admin.adminPassword) {
                    const adminUser = {
                        ...admin._doc,
                        isAdmin: true,
                        userID: admin._id, // Use MongoDB _id as userID
                        userName: admin.adminName
                    };
                    return done(null, adminUser);
                } else {
                    // password doesn't match for admin, check regular user
                    return checkRegularUser(username, password, done);
                }
            } else {
                // not an admin check regular user
                return checkRegularUser(req, username, password, done);
            }
        })
        .catch((err) => {
            console.error("Admin check error:", err);
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
            done(err);
        });

};

const strategy = new LocalStrategy({ passReqToCallback: true }, verifyCallback);

passport.use(strategy);

passport.serializeUser((user, done) => {
    const sessionUser = {
        id: user._id,
        isAdmin: user.isAdmin || false,
        type: user.isAdmin ? 'admin' : 'user'
    };
    done(null, sessionUser);
});

passport.deserializeUser((sessionUser, done) => {
    if (sessionUser.type === 'admin') {
        Admin.findById(sessionUser.id)
            .then((admin) => {
                if (admin) {
                    const adminUser = {
                        ...admin._doc,
                        isAdmin: true,
                        userID: admin._id,
                        userName: admin.adminName
                    };
                    done(null, adminUser);
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