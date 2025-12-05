# Utiliser une image officielle Node.js stable
FROM node:lts-bullseye

# Mise à jour des paquets système + installation utilitaires
RUN apt-get update && \
    apt-get install -y ffmpeg imagemagick webp && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier uniquement le fichier des dépendances
COPY package.json .

# Installer les dépendances Node.js avec contournement peer-deps
RUN npm install --legacy-peer-deps

# Installer les outils globaux séparément
RUN npm install -g qrcode-terminal pm2

# Copier le reste du code source
COPY . .

# Exposer le port utilisé par l'app (assure-toi que c’est bien 5000 dans ton code)
EXPOSE 5000

# Commande pour lancer l'app
CMD ["npm", "start"]
