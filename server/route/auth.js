const express = require('express');
const router = express.Router();
const Resto = require('../models/Resto');
const Review = require('../models/Review');
const User = require('../models/User');
const passport = require('passport');
const multer = require('multer')
const fs = require('fs');
const e = require('express');
const bcrypt = require('bcrypt');
const { loadEnvFile } = require('process');
const Sessions = require('../models/Session');
require('../config/passport.js')
const Admin = require('../models/Admin');
const Moderator = require('../models/Moderator');
const { ensureAuthenticated } = require('./authcheck.js');

// router.use(async (req,res,next) => {
//   console.log(req.session);
//   console.log(req.sessionID)
//   const resSesh = await Sessions.findOne({_id: req.sessionID})
//   console.log(resSesh)
//   next();
// })

const storage = multer.diskStorage({
    destination: function(req, res, cb) {
      cb(null, './public/img')
    },
    filename: function(req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
  const upload = multer({
    storage: storage,
  }).single('image')
  


router.get('/login', async (req, res) => {
    if(req.user){
        res.redirect('/')
    }
    res.render('login', {layout: 'loginregister', css: ['styles_j']})
})


router.post('/login', passport.authenticate('local', { failureRedirect: '/login-failed' }), function(req, res) {
    // If "remember me" is checked, set a longer session duration
    if (req.body.rememberme) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
        req.session.cookie.expires = false; // Session expires when browser is closed
    }
    
    // Check user type and redirect accordingly
    if (req.user.isAdmin) {
        res.redirect('/admin');
    } else if (req.user.isModerator) {
        res.redirect('/moderator');
    } else {
        res.redirect('/');
    }
});

router.get('/admin', async (req, res) => {
    // Check if user is authenticated and is admin
    if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.redirect('/login');
    }
    
    // render admin page
    res.render('admin', { 
        css: ['styles2'], 
        user: req.user,
        isAdmin: true 
    });
});


router.get('/moderator', ensureAuthenticated, async (req, res) => {
    // Check if user is authenticated and is moderator
    if (!req.isAuthenticated() || !req.user.isModerator) {
        return res.redirect('/login');
    }
});

router.get('/register', async (req, res) => {
    if(req.user){
        res.redirect('/')
    }
    
    try {
        // Fetch all reviews from the database
        const reviews = await Review.find({})
            .sort({ reviewDate: -1 }) // Sort by most recent first
            .select('reviewID reviewTitle reviewContent reviewRating restoID userID reviewDate') // Select only needed fields
        
        // render moderator page with reviews
        res.render('moderator', { 
            css: ['styles2'], 
            user: req.user,
            isModerator: true,
            reviews: reviews || [],
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        req.flash('error_msg', 'Error loading reviews');
        res.render('moderator', { 
            css: ['styles2'], 
            user: req.user,
            isModerator: true,
            reviews: [],
            error_msg: req.flash('error_msg')
        });
    }
});



router.get('/register', async (req, res) => {
    if(req.user){
        return res.redirect('/');
    }
    res.render('register', { layout: 'loginregister', css: ['styles_j'], errors: [],success_msg: req.flash('success_msg'),error_msg: req.flash('error_msg')});
});

router.post('/moderator/delete-review/:reviewID', ensureAuthenticated, async (req, res) => {
    // check if user is authenticated and is moderator
    if (!req.isAuthenticated() || !req.user.isModerator) {
        req.flash('error_msg', 'Access denied');
        return res.redirect('/login');
    }

    try {
        const reviewID = req.params.reviewID;
        
        // Find and delete the review
        const review = await Review.findOneAndDelete({ reviewID: reviewID });
        
        if (!review) {
            req.flash('error_msg', 'Review not found');
            return res.redirect('/moderator');
        }
        
        console.log(`Review ${reviewID} deleted by moderator ${req.user.userName}`);
        
        req.flash('success_msg', 'Review deleted successfully');
        res.redirect('/moderator');
    } catch (error) {
        console.error('Error deleting review:', error);
        req.flash('error_msg', 'Error deleting review');
        res.redirect('/moderator');
    }
});


router.get('/login-failed', async (req, res) => {
  //essentially if lockInfo exists, username being tried is locked
    const lockInfo = req.session.lockInfo;
    const isLocked = !!lockInfo;

    if (isLocked) delete req.session.lockInfo;

    res.render('login', {layout: 'loginregister',css: ['styles_j'],isFailed: !isLocked, lockMinutes: lockInfo?.minutes || 0, lockSeconds: lockInfo?.seconds || 0});
});


router.post('/register', upload, async (req, res) => {
    const users = await User.find({}).sort({_id: -1})
    lastID = users[0]?.userID || 0;
    const { username, password, password2, description, security1, security2, security3, answer1, answer2, answer3 } = req.body
    let errors = []
    let success = false
    let filename = ""
    console.log(req.file);
    if(req.file){
      filename = "/img/" + req.file.filename
    }

    if(await User.findOne({userName: username})){
      console.log("Existing")
      errors.push("Username Already Taken")
    }

    if(password !== password2){
      errors.push("Password does not match")
    }

    console.log(errors.length)
    if(errors.length > 0){
      if(req.file){
        console.log('./public/img/'+req.file.filename);
        fs.unlink('./public/img/'+req.file.filename, (err) => {
          if(err) return console.error(err)
          console.log('File deleted successfully')
        })
      }
      res.render("register", {layout: 'loginregister', css: ['styles_j'], errors})
    }else{
      let genSalt = ""
      let hashedPassword = ""
      bcrypt.genSalt(10, (err,salt) => {
        genSalt = salt
      bcrypt.hash(password, salt, (err, hash) => {
          const newUser = new User({
            userID: lastID + 1,
            userName: username,
            userPassword: hash,
            userDesc: description,
            userImage: filename,
            question1: security1, 
            question2: security2, 
            question3: security3, 
            answer1: answer1, 
            answer2: answer2, 
            answer3: answer3
          })
          newUser.save()
        })
      })

      res.redirect('/login')
    }
    
    
})

router.get('/logout', (req, res, next) => {
    req.logout((err)=> {
        if (err) {return next(err)};
        res.redirect('/');
    });
})

module.exports  = router;
