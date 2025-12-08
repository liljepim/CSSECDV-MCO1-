require("dotenv").config();
const express = require("express");
const { engine } = require("express-handlebars");
const path = require("path");
const session = require("express-session");
const app = express();
const MongoStore = require("connect-mongo");
const passport = require("passport");
const PORT = 3000 || process.env.PORT;
const connectDB = require("./server/config/db");
const Sessions = require("./server/models/Session.js");
const bodyParser = require("body-parser");
const https = require("https");
const fs = require("fs");
const flash = require("connect-flash");

/*
const options = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.cert')
}
*/
// For development only using reload
const reload = require("reload");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to DB
connectDB();

app.engine(
    "hbs",
    engine({
        extname: ".hbs",
        defaultLayout: "main",
        partialsDir: path.join(__dirname, "views/partials"),
        layoutsDir: path.join(__dirname, "views/layouts/mainLayout"),
        runtimeOptions: {
            allowProtoPropertiesByDefault: true,
            allowProtoMethodsByDefault: true,
        },
        helpers: {
            // Add this helper function
            eq: function(a, b) {
                return a === b;
            },
        },
    }),
);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "hbs");

app.use(
    session({
        secret: "TasteTaft",
        resave: true,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: null,
        },

        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            mongoOptions: {
                useNewUrlParser: true,
            },
            autoremove: "native",
            ttl: 24 * 60 * 60,
            collectionName: "sessions",
        }),
    }),
);

require("./server/config/passport.js");

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    next();
});
// app.use((req, res, next) => {
//     console.log(req.session);
//     console.log(req.user);
//     next();
// });

app.use("/", require("./server/route/main.js"));
app.use("/", require("./server/route/auth.js"));
app.use((req, res) => {
    res
        .status(404)
        .render("notfound", { css: ["notfound"], title: "Page not Found" });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).render("error", {
        css: ["notfound"],
        title: "Oh no something went wrong",
    });
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}...`);
});

// https.createServer(options, app).listen(PORT, () => {
//     console.log(`Server is listening on port ${PORT}...`)
// })
reload(app)
    .then(() => {
        console.log("🔄 Hot Reload Enabled");
    })
    .catch((err) => {
        console.error("Reload error:", err);
    });
