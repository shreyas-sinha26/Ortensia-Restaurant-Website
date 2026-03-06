const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const flash = require('connect-flash');

// Models
const User = require('./models/user');
const Order = require('./models/order'); 
const Reservation = require('./models/reservation'); 

const app = express();

// --- Database Connection ---
mongoose.connect('mongodb://127.0.0.1:27017/ortensia') // Note: You can also rename the DB to ortensia here
.then(() => console.log('Connected to MongoDB successfully!'))
.catch(err => console.error('MongoDB connection error:', err));

// --- App Configuration ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, 
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionConfig));
app.use(flash());

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global variables middleware 
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// --- Routes ---

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/index', (req, res) => {
    res.render('index');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email });
        await User.register(user, password);
        
        // Updated name in flash message!
        req.flash('success', 'Welcome to Ōrtensia! Please log in to enter the site.');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/signup');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', 
    passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), 
    (req, res) => {
        req.flash('success', 'Welcome back!');
        res.redirect('/index'); 
    }
);

app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success', 'Goodbye! See you next time.');
        res.redirect('/');
    });
});

app.get('/menu', (req, res) => {
    res.render('menu');
});

app.get('/delivery', async (req, res) => {
    try {
        const orders = await Order.find({}); 
        res.render('delivery', { orders }); 
    } catch (err) {
        console.error("Error loading orders:", err);
        res.render('delivery', { orders: [] }); 
    }
});

app.post('/delivery', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        req.flash('success', 'Order submitted successfully!');
        res.redirect('/delivery');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to submit order. Please try again.');
        res.redirect('/delivery');
    }
});

app.get('/reservation', async (req, res) => {
    try {
        const reservations = await Reservation.find({}); 
        res.render('reservation', { reservations }); 
    } catch (err) {
        console.error("Error loading reservations:", err);
        res.render('reservation', { reservations: [] });
    }
});

app.post('/reservation', async (req, res) => {
    try {
        const newReservation = new Reservation(req.body);
        await newReservation.save();
        req.flash('success', 'Table reserved successfully!');
        res.redirect('/reservation');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to save reservation. Please try again.');
        res.redirect('/reservation');
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});