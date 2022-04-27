import express from 'express'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import handlebars from 'express-handlebars'
import mongoose from 'mongoose'
import path from 'path'
import bcrypt from 'bcrypt';
import User from './schema/User.js'
import passport from 'passport';
import {
    Strategy as LocalStrategy
} from 'passport-local';
import * as url from 'url';



const __filename = url.fileURLToPath(
    import.meta.url);
const __dirname = url.fileURLToPath(new URL('.',
    import.meta.url));



const app = express()
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}))
app.use(express.static(__dirname + '/public'))

const PORT = process.env.port || 8080
const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`))



// Handlebars engine
app.engine('handlebars', handlebars.engine())
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'handlebars')





mongoose.connect('mongodb+srv://chantal:logaritmoC@cluster0.dpj6h.mongodb.net/userSession?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => {
    if (err) throw new Error("Couldn't connect to db ")
    console.log('db connected ')
})


//session & mongoose configuration
app.use(session({
    store: MongoStore.create({
        mongoUrl: 'mongodb+srv://chantal:logaritmoC@cluster0.dpj6h.mongodb.net/userSession?retryWrites=true&w=majority',
        ttl: 10000
    }),
    secret: 'gd45fs15s8',
    resave: false,
    saveUninitialized: false

}))

const createHash = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10))
}


// Settings passport
app.use(passport.initialize());
app.use(passport.session());

// Serialización del passport
passport.serializeUser((user, done) => {
    return done(null, user.id);
})

// Deserialización
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        return done(err, user)
    })
})



//PASSPORT SIGNUP
passport.use('signup', new LocalStrategy({
    passReqToCallback: true
}, (req, username, password, done) => {
    User.findOne({
        username: username
    }, (err, user) => {
        if (err) return done(err);
        if (user) return done(null, false, {
            message: 'user already exists'
        });
        const newUser = {
            username: username,

            password: createHash(password)
        }
        User.create(newUser, (err, userCreated) => {
            if (err) return done(err);
            return done(null, userCreated)
        })
    })
}))



//PASSPORT HOME
passport.use('homeLogin', new LocalStrategy({
    passReqToCallback: true
}, (req, username, password, done) => {
    console.log(username)
    User.findOne({
        username: username
    }, (err, user) => {
        if (err) done(err)
        if (user) {
            if (!bcrypt.compareSync(password, user.password)) {
                console.log('wrong password')
            } else {
                return done(null, user)
            }
        } else {
            return done(null, {
                message: 'No user found'
            })
        }

    })
}))


app.get('/', (req, res) => {
    res.render('home')
})

app.get('/signup', (req, res) => {
    res.render('signup')
})

app.get('/profile', (req, res) => {
    res.render('profile')
})

app.get('/tryagain', (req, res) => {
    res.render('tryagain')
})

app.get('/logout', (req, res) => {
    res.render('logout')
})


app.post('/', passport.authenticate('homeLogin', {
    failureRedirect: '/tryagain'
}),  (req, res) => {
    res.redirect('/profile')
})

app.post('/signup', passport.authenticate('signup', {
    failureRedirect: '/tryagain'
}), (req, res) => {
    res.redirect('/profile')
})


app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/')
    })
})



//isAuth