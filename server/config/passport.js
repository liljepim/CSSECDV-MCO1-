const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcrypt');
const verifyCallback = (req, username, password, done) => {
    console.log(req.body)
    User.findOne({ userName: username })
        .then((user) => {

            if (!user) {  return done(null, false) }

            bcrypt.compare(password, user.userPassword, (err, result) => {
                if (result) {
                    // if(req.body.rememberme){
                    //     req.session.rememberme = req.body.rememberme
                    // } else {
                    //     req.session.cookie.expires = false
                    // }
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            })
        })
        .catch((err) => {   
            done(err);
        });
}

const strategy = new LocalStrategy({passReqToCallback: true},verifyCallback);

passport.use(strategy);

passport.serializeUser((user, done) => {
    done(null, user.id)
});

passport.deserializeUser((userId, done) => {
    User.findById(userId)
        .then((user) => {
            done(null, user);
        })
        .catch(err => done(err))
})