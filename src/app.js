import express from 'express'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import handlebars from 'express-handlebars'
import mongoose from 'mongoose'
import path from 'path'
import bcrypt from 'bcrypt';
import User from './schema/User.js'
import dotenv from 'dotenv';
import passport from 'passport';
//FORK
import {
    fork
} from 'child_process'
import {
    Strategy as LocalStrategy
} from 'passport-local';
dotenv.config();



import * as url from 'url';
import {
    query
} from 'express'
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




mongoose.connect(process.env.MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => {
    if (err) throw new Error("Couldn't connect to db ")
    console.log('db connected ')
})


//session & mongoose configuration
app.use(session({
    store: MongoStore.create({
        mongoUrl: process.env.SESSION,
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
}), (req, res) => {
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


let infoData = [{
        name: process.platform
    },
    {
        name: process.pid
    },
    {
        name: process.version
    },
    {
        name: process.cwd()
    },
    {
        name: process.title
    },
    {
        name: process.memoryUsage
    }
]

app.get('/info', (req, res) => {
    res.render('info', {
        infoData: infoData
    })
})

//send me va a permitir enviar un dato del proceso padre al proceso hijo


const child = fork(__dirname + './randomNumber.js')
// // QUERY
app.get('/randoms', (req, res) => {
    let queryNumber = req.query.cant
    child.send(queryNumber)
    
    child.on('message', (childObj)=>{
        console.log(childObj)
        res.send(childObj)
    })
   
})






