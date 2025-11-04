module.exports = {
  ensureAuthenticated: function (req, res, next) {
    // Continue to requested site if authenticated and has permissions (roles still to implement)
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login')
  },

  forwardAuthenticated: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }

    res.redirect('/restos')
  }
};
