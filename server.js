'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const res = require('express/lib/response.js');
const session = require('express-session');
const passport = require('passport');
const app = express();
const routes = require('./routes.js');
const auth = require('./auth.js');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid', // nombre de la cookie
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

app.set('view engine', 'pug');
app.set('views', './views/pug');


myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  routes(app, myDataBase);
  auth(app, myDataBase); 
  let currentUsers = 0;
  

  io.on('connection', socket => {
    console.log('user ' + socket.request.user.username + ' connected');
    ++currentUsers;
    io.emit('user', {
	  username: socket.request.user.username,
	  currentUsers,
	  connected: true
	});
  socket.on('chat message', (message) => {
    io.emit('chat message', { name: socket.request.user.name, message });
  });

    socket.on('disconnect', () => {
      console.log('user ' + socket.request.user.username + ' disconnected');
      --currentUsers;
      io.emit('user', {
		  username: socket.request.user.username,
		  currentUsers,
		  connected: false
	  });
    });
  });
  // Be sure to add this...
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database', showLogin: true });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
