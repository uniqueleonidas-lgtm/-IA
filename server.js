const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const COMMENTS_FILE = path.join(__dirname, 'comments.json');

// Charger les anciens commentaires
let comments = [];
if (fs.existsSync(COMMENTS_FILE)) {
  comments = JSON.parse(fs.readFileSync(COMMENTS_FILE));
}

// Middleware pour servir les fichiers statiques
app.use(express.static(__dirname));

// Page principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// Socket.IO : Gestion des commentaires en live
io.on('connection', (socket) => {
  console.log('User connected');

  // Envoyer les anciens commentaires au nouvel utilisateur
  socket.emit('loadComments', comments);

  // Lorsqu'un nouveau commentaire arrive
  socket.on('newComment', (data) => {
    comments.push(data);
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
    io.emit('broadcastComment', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
