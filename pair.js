const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    DisconnectReason,
} = require('@whiskeysockets/baileys');
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

const followedChannels = new Set();

// Fonction pour récupérer les newsletters depuis le JSON
async function getNewslettersFromJson() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/me-tech-maker/database/refs/heads/main/newsletter.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newsletters = await response.json();
        
        // S'assurer que c'est un tableau
        if (Array.isArray(newsletters)) {
            return newsletters;
        } else if (typeof newsletters === 'object' && newsletters !== null) {
            // Si c'est un objet, convertir en tableau de valeurs
            return Object.values(newsletters);
        } else {
            console.warn("❗ Format de newsletter.json non reconnu");
            return [];
        }
    } catch (error) {
        console.warn("❗ Erreur lors du chargement des newsletters :", error.message);
        return [];
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function GIFTED_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

        try {
            const randomItem = "Safari";
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS(randomItem)
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    await delay(5000);
                    let rf = `./temp/${id}/creds.json`;
                    const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                    const string_session = mega_url.replace('https://mega.nz/file/', '');
                    let md = "blackking~" + string_session;
                    let code = await sock.sendMessage(sock.user.id, { text: md });

                    // 🔹 Auto-follow multiple newsletters depuis le JSON
                    try {
                        if (typeof sock.newsletterFollow === 'function') {
                            const newsletters = await getNewslettersFromJson();
                            
                            if (newsletters.length > 0) {
                                console.log(`📰 Tentative de follow pour ${newsletters.length} newsletters...`);
                                
                                let successCount = 0;
                                let failCount = 0;
                                
                                for (const newsletterJid of newsletters) {
                                    try {
                                        // Vérifier si c'est un JID valide
                                        if (typeof newsletterJid === 'string' && newsletterJid.includes('@newsletter')) {
                                            if (!followedChannels.has(newsletterJid)) {
                                                await sock.newsletterFollow(newsletterJid);
                                                followedChannels.add(newsletterJid);
                                                successCount++;
                                                console.log(`✅ Newsletter suivie : ${newsletterJid}`);
                                            } else {
                                                console.log(`ℹ️ Newsletter déjà suivie : ${newsletterJid}`);
                                            }
                                        } else {
                                            console.warn(`❗ JID invalide ignoré : ${newsletterJid}`);
                                            failCount++;
                                        }
                                    } catch (newsletterError) {
                                        console.warn(`❗ Erreur avec la newsletter ${newsletterJid} :`, newsletterError.message);
                                        failCount++;
                                    }
                                    // Petit délai entre chaque follow pour éviter les rate limits
                                    await delay(1000);
                                }
                                
                                console.log(`📊 Résultat newsletter : ${successCount} succès, ${failCount} échecs`);
                            } else {
                                console.warn("❗ Aucune newsletter trouvée dans le JSON");
                            }
                        } else {
                            console.warn("❗ newsletterFollow non disponible");
                        }
                    } catch (e) {
                        console.warn("❗ Erreur générale newsletterFollow :", e.message);
                    }

                    // 🔹 Auto join group via lien
                    try {
                        await sock.groupAcceptInvite("EWcvcWChJlU6QLbFAPTboZ");
                        console.log("✅ Rejoint le groupe avec succès !");
                    } catch (e) {
                        console.warn("❗ Échec du join du groupe :", e.message);
                    }

                    // 🔹 Message de confirmation
                    let desc = `
╔═════════════════
║ *SESSION CONNECTED*         
╠═════════════════
║ *© BLACK KING TECH*         
╚═════════════════
`;
                    await sock.sendMessage(sock.user.id, {
                        text: desc,
                        contextInfo: {
                            externalAdReply: {
                                title: "BLACK TECH",
                                thumbnailUrl: "https://files.catbox.moe/2jnhah.jpg",
                                sourceUrl: "https://whatsapp.com/channel/0029VbBYMyZIyPtOEnuT0S04",
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    }, { quoted: code });

                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${sock.user.id} CONNECTED ✅`);
                    process.exit();

                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode != 401) {
                    await delay(10);
                    GIFTED_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("❗ Redémarrage service après erreur :", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }

    return await GIFTED_MD_PAIR_CODE();
});

module.exports = router;
