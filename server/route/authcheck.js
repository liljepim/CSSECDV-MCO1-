module.exports = {
  ensureAuthenticated: function (req, res, next) {
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login')
  },

  ensureAdmin: function (req, res, next) {
    if(req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.redirect('/login')
  },

  ensureModerator: function (req, res, next) {
    if(req.isAuthenticated() && req.user.isModerator) {
      return next();
    }
    res.redirect('/login')
  },

  forwardAuthenticated: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }

    // redirect authenticated users based on their role
    if (req.user.isAdmin) {
      res.redirect('/admin');
    } else if (req.user.isModerator) {
      res.redirect('/moderator');
    } else {
      res.redirect('/restos');
    }
  }
};