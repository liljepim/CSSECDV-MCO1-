require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const app = express();
const MongoStore = require('connect-mongo')
const passport = require('passport');
const PORT = 3000 || process.env.PORT;
const connectDB = require('./server/config/db');
const Sessions = require('./server/models/Session.js')
const bodyParser = require('body-parser');
const https = require('https')
const fs = require('fs')

const options = {
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.cert')
}


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to DB 
connectDB();

app.engine('hbs', engine({
    extname : '.hbs', 
    defaultLayout: 'main',
    partialsDir: path.join(__dirname, 'views/partials'),
    layoutsDir: path.join(__dirname, 'views/layouts/mainLayout'),
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    }
}));

app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'hbs');

app.use(session({
    secret: 'TasteTaft',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl : process.env.MONGODB_URI,
        mongoOptions: {
            useNewUrlParser: true,
        },
        cookie : {
            maxAge: (req,res) => {
                if(req.user && req.user.rememberme){
                    console.log("inside")
                    return 24 * 60 * 60 * 1000
                } else {
                    console.log("inside")
                    return null
                }
            },
            expires: false
        },
        collectionName:  'sessions'
    })
}))

require('./server/config/passport.js')

app.use(passport.initialize());
app.use(passport.session());

// app.use((req, res, next) => {
//     console.log(req.session);
//     console.log(req.user);
//     next();
// });

app.use('/', require('./server/route/main.js'));
app.use('/', require('./server/route/auth.js'))


// app.listen(PORT, () => {
//     console.log(`Server is listening on port ${PORT}...`);
// })

https.createServer(options, app).listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}...`)
})
