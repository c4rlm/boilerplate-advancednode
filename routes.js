const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
    // Be sure to change the title
  app.route('/').get((req, res) => {
    // Change the response to render the Pug template
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
	  showSocialAuth: true
    });
  });
  // Ruta para manejar el login con GitHub
  app.route('/auth/github')
  .get(passport.authenticate('github'), (req, res) => {
	
  });
  // Ruta para manejar el callback de GitHub
  app.route('/auth/github/callback')
    .get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
      res.redirect('/profile');
	});
  app.route('/login')
	.post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
	  console.log(`User ${req.body.username} attempted to log in.`);
	  res.redirect('/profile');
	});
	app.route('/profile')
	  .get(ensureAuthenticated,(req, res) => {
		res.render('profile',{username:req.user.username});
	  });

	app.route('/logout')
	  .get((req, res) => {
		req.logout();
		res.redirect('/');
	});
	app.route('/register')
	  .post((req, res, next) => {
		myDataBase.findOne({ username: req.body.username }, (err, user) => {
		  if (err) {
			next(err);
		  } else if (user) {
			res.redirect('/');
		  } else {
			const hash = bcrypt.hashSync(req.body.password, 12);
			myDataBase.insertOne({
			  username: req.body.username,
			  password: hash
			},
			  (err, doc) => {
				if (err) {
				  res.redirect('/');
				} else {
				  // The inserted document is held within
				  // the ops property of the doc
				  next(null, doc.ops[0]);
				}
			  }
			)
		  }
		})
	  },
		passport.authenticate('local', { failureRedirect: '/' }),
		(req, res, next) => {
		  res.redirect('/profile');
		}
	);

	app.route('/chat')
    .get(ensureAuthenticated, (req, res) => {
      res.render('chat', { user: req.user });
    });

	function ensureAuthenticated(req, res, next) {
		if (req.isAuthenticated()) {
		  return next();
		}
		res.redirect('/');
	}

	app.use((req, res, next) => {
	  res.status(404)
		.type('text')
		.send('Not Found');
	});
}