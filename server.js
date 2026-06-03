require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

let seedProfiles = [];
try {
  seedProfiles = require('./profiles.json');
} catch (error) {
  console.log('profiles.json no encontrado, continuando sin perfiles iniciales.');
}

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/love_match';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: String,
  age: Number,
  city: String,
  gender: String,
  lookingFor: String,
  hobbies: String,
  likedProfiles: [String],
  matches: [String]
}, { timestamps: true });

const profileSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  lookingFor: String,
  city: String,
  bio: String,
  hobbies: String,
  photo: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Profile = mongoose.model('Profile', profileSchema);

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('MongoDB conectado');
  const count = await Profile.countDocuments();

  if (count === 0 && seedProfiles.length > 0) {
    await Profile.insertMany(seedProfiles);
    console.log('Perfiles iniciales cargados');
  }
}).catch(err => console.error('Error MongoDB:', err.message));

app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI })
}));

function auth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

async function currentUser(req) {
  if (!req.session.userId) return null;
  return User.findById(req.session.userId).lean();
}

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.render('login', { error: 'Correo o contraseña incorrectos.' });
  }

  req.session.userId = user._id.toString();
  res.redirect('/');
});

app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', async (req, res) => {
  try {
    const { email, password, name, age, city, gender, lookingFor, hobbies } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hash,
      name,
      age,
      city,
      gender,
      lookingFor,
      hobbies,
      likedProfiles: [],
      matches: []
    });

    req.session.userId = user._id.toString();
    res.redirect('/');
  } catch (e) {
    res.render('register', { error: 'No se pudo registrar. Puede que el correo ya exista.' });
  }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

app.get('/', auth, async (req, res) => {
  const user = await currentUser(req);

  const query = {
    _id: { $nin: [...(user.likedProfiles || []), ...(user.matches || [])] }
  };

  if (user.lookingFor === 'Mujeres') query.gender = 'Mujer';
  if (user.lookingFor === 'Hombres') query.gender = 'Hombre';

  const profile = await Profile.findOne(query).lean();
  const matches = await Profile.find({ _id: { $in: user.matches || [] } }).lean();

  res.render('index', { user, profile, matches });
});

app.post('/like/:id', auth, async (req, res) => {
  const isMatch = Math.random() < 0.65;

  const update = isMatch
    ? { $addToSet: { matches: req.params.id, likedProfiles: req.params.id } }
    : { $addToSet: { likedProfiles: req.params.id } };

  await User.findByIdAndUpdate(req.session.userId, update);

  if (isMatch) return res.redirect('/match/' + req.params.id);
  res.redirect('/');
});

app.post('/skip/:id', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.session.userId, {
    $addToSet: { likedProfiles: req.params.id }
  });

  res.redirect('/');
});

app.get('/match/:id', auth, async (req, res) => {
  const user = await currentUser(req);
  const profile = await Profile.findById(req.params.id).lean();
  const ice = await generateIcebreaker(user, profile);

  res.render('match', { user, profile, ice });
});

app.get('/chat/:id', auth, async (req, res) => {
  const user = await currentUser(req);
  const profile = await Profile.findById(req.params.id).lean();
  const matches = await Profile.find({ _id: { $in: user.matches || [] } }).lean();

  res.render('chat', { user, profile, matches });
});

app.post('/api/gemini-chat', auth, async (req, res) => {
  const { message, profileId } = req.body;
  const user = await currentUser(req);

  let prompt;

  if (profileId) {
    const profile = await Profile.findById(profileId).lean();
    prompt = `Responde como ${profile.name}, una persona de ${profile.city}. Bio: ${profile.bio}. Gustos: ${profile.hobbies}. Usuario: ${user.name}. Mensaje: ${message}. Responde casual, mexicano, corto y natural.`;
  } else {
    prompt = `Eres Gemini AI dentro de una app de citas. Ayuda al usuario ${user.name} a crear mensajes, buscar planes o recomendar lugares para citas en Veracruz. Mensaje: ${message}. Responde corto y claro.`;
  }

  const reply = await callGemini(prompt) || 'Puedo ayudarte con ideas de mensajes, rompehielos y lugares para una cita en Veracruz. 😄';
  res.json({ reply });
});

app.post('/api/icebreaker', auth, async (req, res) => {
  const user = await currentUser(req);
  const profile = await Profile.findById(req.body.profileId).lean();

  res.json({ text: await generateIcebreaker(user, profile) });
});

app.get('/api/config', (req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
});

async function generateIcebreaker(user, profile) {
  const prompt = `Genera 3 mensajes rompehielos naturales en español mexicano para iniciar chat en una app de citas. Usuario: ${user.name}, gustos: ${user.hobbies}. Match: ${profile.name}, bio: ${profile.bio}, gustos: ${profile.hobbies}. Que sean cortos, divertidos y enfocados en Veracruz.`;

  return await callGemini(prompt) || `Opción 1: ${profile.name}, vi que te late ${profile.bio.toLowerCase()}, ¿jalamos por algo rico en Veracruz?

Opción 2: Tengo una duda importante: ¿tacos, pizza o café para una primera salida?

Opción 3: Tu plan suena bueno, ¿me recomiendas un lugar para empezar?`;
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;

  if (!key || key.includes('PEGA_AQUI')) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await r.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e) {
    console.error('Gemini error:', e.message);
    return null;
  }
}

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
