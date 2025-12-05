const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
__path = process.cwd();

// Création du serveur HTTP pour Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;

// Importation de vos routes existantes
let serverRoute = require('./qr'),
    code = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connexion à MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://onnui688:FSybn9yxLAYpGrZj@purge-quizz.aejj5y8.mongodb.net/?retryWrites=true&w=majority&appName=Purge-quizz';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connecté à MongoDB Atlas'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Schéma de commentaire
const commentSchema = new mongoose.Schema({
  nomDev: { type: String, required: true },
  numOrGmail: { type: String, required: true },
  commentaire: { type: String, required: true },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);

// Routes API pour les commentaires
// Récupérer tous les commentaires
app.get('/api/comments', async (req, res) => {
  try {
    const comments = await Comment.find().sort({ createdAt: -1 }).limit(50);
    res.json(comments);
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un commentaire
app.post('/api/comments', async (req, res) => {
  try {
    const { nomDev, numOrGmail, commentaire } = req.body;
    
    if (!nomDev || !numOrGmail || !commentaire) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    
    // Validation basique
    if (nomDev.length > 50 || numOrGmail.length > 100 || commentaire.length > 500) {
      return res.status(400).json({ error: 'Les champs sont trop longs' });
    }
    
    const newComment = new Comment({ 
      nomDev: nomDev.trim(), 
      numOrGmail: numOrGmail.trim(), 
      commentaire: commentaire.trim() 
    });
    
    await newComment.save();
    
    // Diffuser le nouveau commentaire à tous les clients
    io.emit('new-comment', newComment);
    
    res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Incrémenter les likes
app.post('/api/comments/:id/like', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }
    
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }
    
    comment.likes += 1;
    await comment.save();
    
    // Diffuser la mise à jour des likes à tous les clients
    io.emit('like-updated', { id: comment._id, likes: comment.likes });
    
    res.json({ success: true, likes: comment.likes });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du like:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Vos routes existantes
app.use('/server', serverRoute);
app.use('/code', code);
app.use('/pair',async (req, res, next) => {
  res.sendFile(__path + '/pair.html')
});
app.use('/qr',async (req, res, next) => {
  res.sendFile(__path + '/qr.html')
});
app.use('/',async (req, res, next) => {
  res.sendFile(__path + '/main.html')
});

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté');
  
  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté');
  });
});

// Utilisation du serveur HTTP au lieu de app.listen
server.listen(PORT, () => {
  console.log(`
Don't Forget To Give Star BLACK KING

 Server running on http://localhost:` + PORT)
});

module.exports = app;
