const express = require("express");
const router = express.Router();
const Resto = require("../models/Resto");
const Review = require("../models/Review");
const User = require("../models/User");
const passport = require("passport");
const multer = require("multer");
const fs = require("fs");
const e = require("express");
const bcrypt = require("bcrypt");
const { loadEnvFile } = require("process");
const Sessions = require("../models/Session");
require("../config/passport.js");
const Admin = require("../models/Admin");
const Moderator = require("../models/Moderator");
const { ensureAuthenticated } = require("./authcheck.js");
const Log = require("../models/Logs");

// router.use(async (req,res,next) => {
//   console.log(req.session);
//   console.log(req.sessionID)
//   const resSesh = await Sessions.findOne({_id: req.sessionID})
//   console.log(resSesh)
//   next();
// })

const storage = multer.diskStorage({
    destination: function(req, res, cb) {
        cb(null, "./public/img");
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({
    limits: {
        fileSize: 25 * 1024 * 1024,
        files: 1,
    },
    storage: storage,
}).single("image");

router.get("/login", async (req, res) => {
    if (req.user) {
        res.redirect("/");
    }
    res.render("login", {
        layout: "loginregister",
        css: ["styles_j"],
        alert: req.query.alert || null,
    });
});

router.post(
    "/login",
    passport.authenticate("local", { failureRedirect: "/login-failed" }),
    function(req, res) {
        // If "remember me" is checked, set a longer session duration
        if (req.body.rememberme) {
            console.log("Remember me triggered");
            req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
            req.session.touch();
        } else {
            console.log("None remember me session triggered");
            req.session.cookie.expires = false; // Session expires when browser is closed
            req.session.cookie.maxAge = null;
        }

        // Check user type and redirect accordingly
        if (req.user.isAdmin) {
            res.redirect("/admin");
        } else if (req.user.isModerator) {
            res.redirect("/moderator");
        } else {
            res.redirect("/");
        }
    },
);

router.get("/forget", async (req, res) => {
    if (req.user) {
        res.redirect("/");
    }
    res.render("forget-pass", {
        layout: "loginregister",
        css: ["styles_j"],
        error: req.query.error || null,
    });
});

router.post("/forget", async (req, res) => {
    const { username } = req.body;
    console.log(username);
    const user = await User.findOne({ userName: username });
    if (!user) {
        return res.redirect("/forget?error=User+not+found");
    }
    req.session.resetUser = user.userName;
    res.redirect("/security-questions");
});

router.get("/security-questions", async (req, res) => {
    if (!req.session.resetUser) {
        res.redirect("/forget");
    }
    const user = await User.findOne({ userName: req.session.resetUser });
    const securityQuestions = [user.question1, user.question2, user.question3];
    const securityAnswers = [user.answer1, user.answer2, user.answer3];
    const n = Math.floor(Math.random() * 3);

    req.session.answer = securityAnswers[n];

    res.render("security-questions", {
        layout: "loginregister",
        css: ["styles_j"],
        question: securityQuestions[n],
        error: req.query.error || null,
    });
});

router.post("/security-questions", async (req, res) => {
    const { answer } = req.body;
    try {
        const match = await bcrypt.compare(answer, req.session.answer);

        if (match) {
            return res.redirect("/change");
        } else {
            return res.redirect("/security-questions?error=Incorrect+answer.");
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get("/change", async (req, res) => {
    if (!req.session.resetUser) {
        return res.redirect("/forget");
    }
    const errorText = req.query.errorText || "";
    const user = await User.findOne({ userName: req.session.resetUser });
    res.render("reset-password", {
        layout: "loginregister",
        css: ["styles_j"],
        errorText,
    });
});

router.post("/change", async (req, res) => {
    if (!req.session.resetUser) return res.redirect("/forget");

    const { password, password2 } = req.body;
    const errors = [];

    try {
        const user = await User.findOne({ userName: req.session.resetUser });
        if (!user) {
            return res.render("reset-password", { errorText: "User not found" });
        }

        if (password !== password2) errors.push("Passwords do not match");

        const dayAge = 24 * 60 * 60 * 1000;

        if (Date.now() - new Date(user.passwordLastChanged).getTime() <= dayAge) {
            console.log("Now:", new Date());
            console.log("passwordLastChanged:", user.passwordLastChanged);
            errors.push("Password must be at least 1 day old before changing");
        }

        const isCurrent = await bcrypt.compare(password, user.userPassword);
        if (isCurrent) errors.push("Cannot reuse any previous passwords");

        for (const entry of user.passwordHistory) {
            if (await bcrypt.compare(password, entry.passwordHash)) {
                errors.push("Cannot reuse any previous passwords");
                break;
            }
        }

        if (errors.length > 0) {
            const user = await User.findOne({ userName: req.session.resetUser });

            return res.render("reset-password", {
                layout: "loginregister",
                css: ["styles_j"],
                errorText: errors.join(". "),
                user,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.passwordHistory.push({ passwordHash: user.userPassword });
        user.userPassword = hashedPassword;
        user.passwordLastChanged = new Date();
        await user.save();

        return res.redirect("/login?alert=Password+Reset+Successful");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Error Updating Password");
    }
});

router.get("/admin", async (req, res) => {
    // Check if user is authenticated and is admin
    if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.redirect("/login");
    }

    try {
        const logs = await Log.find({})
            .sort({ timestamp: -1 })
            .populate("user_id", "userName");
        res.render("admin", {
            css: ["styles2"],
            user: req.user,
            isAdmin: true,
            logs,
        });
    } catch (error) {
        console.log("Error fetching logs: ", error);
        res.status(500).render("error", {
            css: ["notfound"],
            title: "Oh no something went wrong",
        });
    }

    // render admin page
});

router.get("/moderator", ensureAuthenticated, async (req, res) => {
    // Check if user is authenticated and is moderator
    if (!req.isAuthenticated() || !req.user.isModerator) {
        return res.redirect("/login");
    }

    try {
        // Fetch all reviews from the database for moderation
        const reviews = await Review.find({})
            .sort({ reviewDate: -1 }) // Sort by most recent first
            .select(
                "reviewID reviewTitle reviewContent reviewRating restoID userID reviewDate helpfulCount notHelpfulCount",
            ); // Select needed fields

        // Get user information for each review
        const reviewsWithUsers = await Promise.all(
            reviews.map(async (review) => {
                const user = await User.findOne({ userID: review.userID });
                return {
                    ...review.toObject(),
                    userName: user ? user.userName : "Unknown User",
                    userImage: user ? user.userImage : "",
                };
            }),
        );

        // Render moderator page with reviews
        res.render("moderator", {
            css: ["styles2"],
            user: req.user,
            isModerator: true,
            reviews: reviewsWithUsers || [],
            success_msg: req.flash("success_msg"),
            error_msg: req.flash("error_msg"),
        });
    } catch (error) {
        console.error("Error loading moderator page:", error);
        req.flash("error_msg", "Error loading moderator page");
        res.render("moderator", {
            css: ["styles2"],
            user: req.user,
            isModerator: true,
            reviews: [],
            error_msg: req.flash("error_msg"),
        });
    }
});

router.get("/register", async (req, res) => {
    if (req.user) {
        return res.redirect("/");
    }
    res.render("register", {
        layout: "loginregister",
        css: ["styles_j"],
        errors: [],
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
    });
});

router.post(
    "/moderator/delete-review/:reviewID",
    ensureAuthenticated,
    async (req, res) => {
        // check if user is authenticated and is moderator
        if (!req.isAuthenticated() || !req.user.isModerator) {
            req.flash("error_msg", "Access denied");
            return res.redirect("/login");
        }

        try {
            const reviewID = req.params.reviewID;

            // Find and delete the review
            const review = await Review.findOneAndDelete({ reviewID: reviewID });

            if (!review) {
                req.flash("error_msg", "Review not found");
                return res.redirect("/moderator");
            }

            console.log(
                `Review ${reviewID} deleted by moderator ${req.user.userName}`,
            );

            req.flash("success_msg", "Review deleted successfully");
            res.redirect("/moderator");
        } catch (error) {
            console.error("Error deleting review:", error);
            req.flash("error_msg", "Error deleting review");
            res.redirect("/moderator");
        }
    },
);

router.get("/login-failed", async (req, res) => {
    //essentially if lockInfo exists, username being tried is locked
    const lockInfo = req.session.lockInfo;
    const isLocked = !!lockInfo;

    if (isLocked) delete req.session.lockInfo;

    res.render("login", {
        layout: "loginregister",
        css: ["styles_j"],
        isFailed: !isLocked,
        lockMinutes: lockInfo?.minutes || 0,
        lockSeconds: lockInfo?.seconds || 0,
    });
});

router.post("/register", upload, async (req, res) => {
    const users = await User.find({}).sort({ _id: -1 });
    lastID = users[0]?.userID || 0;
    const {
        username,
        password,
        password2,
        description,
        security1,
        security2,
        security3,
        answer1,
        answer2,
        answer3,
    } = req.body;
    let errors = [];
    let success = false;
    let filename = "";
    console.log(req.file);
    if (req.file) {
        filename = "/img/" + req.file.filename;
    }

    if (await User.findOne({ userName: username })) {
        console.log("Existing");
        errors.push("Username Already Taken");
    }

    if (password !== password2) {
        errors.push("Password does not match");
    }

    console.log(errors.length);
    if (errors.length > 0) {
        if (req.file) {
            console.log("./public/img/" + req.file.filename);
            fs.unlink("./public/img/" + req.file.filename, (err) => {
                if (err) return console.error(err);
                console.log("File deleted successfully");
            });
        }
        res.render("register", {
            layout: "loginregister",
            css: ["styles_j"],
            errors,
        });
    } else {
        hashedAns1 = await bcrypt.hash(answer1, 10);
        hashedAns2 = await bcrypt.hash(answer2, 10);
        hashedAns3 = await bcrypt.hash(answer3, 10);
        let genSalt = "";
        let hashedPassword = "";
        bcrypt.genSalt(10, (err, salt) => {
            genSalt = salt;
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
                    answer1: hashedAns1,
                    answer2: hashedAns2,
                    answer3: hashedAns3,
                });
                newUser.save();
            });
        });

        res.redirect("/login");
    }
});

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.session.destroy((err) => {
            if (err) console.error("Error destroying session: ", err);
            console.log("Cookie destroyed");
            res.clearCookie("connect.sid");
            res.redirect("/");
        });
    });
});

function multerErrorHandler(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleWare(req, res, (err) => {
            if (err) {
                err.status = 400;
                return next(err);
            }
            next();
        });
    };
}

module.exports = router;
