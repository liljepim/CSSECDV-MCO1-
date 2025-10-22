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
  

  router.post('/login', passport.authenticate('local', { failureRedirect: '/login-failed' }), function(req, res) {
    // If "remember me" is checked, set a longer session duration
    if (req.body.rememberme) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      req.session.cookie.expires = false; // Session expires when browser is closed
    }
    res.redirect('/');
  });

router.get('/login', async (req, res) => {
    if(req.user){
        res.redirect('/')
    }
    res.render('login', {layout: 'loginregister', css: ['styles_j']})
})


router.get('/login-failed', async (req, res) => {
    res.render('login', {layout: 'loginregister', css: ['styles_j'], isFailed: true})
})

router.get('/register', async (req, res) => {
    
    if(req.user){
        res.redirect('/')
    }
    res.render('register', {layout: 'loginregister', css: ['styles_j']})
})

router.post('/register', upload, async (req, res) => {
    const users = await User.find({}).sort({_id: -1})
    lastID = users[0].userID;
    const { username, password, password2, description} = req.body
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
            userImage: filename
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