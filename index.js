import {
  useMultiFileAuthState,
  makeWASocket,
  DisconnectReason,
  downloadContentFromMessage,
  generateWAMessage,
} from "@whiskeysockets/baileys";
import getRandomMessage from "./src/timer.js";
import getRandomMessageBusy from "./src/busy.js";
import getRandomMood from "./src/getmood.js";
import fs from "fs";
import axios from "axios";
const usedPrefix = "/";

async function fetchSimTalk(text, version = "v1", lc = "en", key = "") {
  const url = `https://api.simsimi.vn/${version}/simtalk`;

  const params = new URLSearchParams();
  params.append("text", text);
  params.append("lc", lc);
  params.append("key", key);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

const adviceApi = "https://api.adviceslip.com/advice";

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("SRIJI-SESSIONS");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    // logger: pino({ level: 'debug' }),
  });
  sock.ev.on("connection.update", async (update) => {
    const { qr, connection, lastDisconnect } = update || {};

    if (qr) {
      console.log("QR Code Generated...");
      console.log(qr);
      // io.emit("whatsapp.qr", qr);
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log("Connection Closed, You're Now Logged Out");
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = {
      name: messages[0]?.pushName?.replace(/\n/g, "")?.trim() || "",
      chat: messages[0]?.key?.remoteJid || "",
      sender: messages[0]?.key?.remoteJid?.endsWith("@s.whatsapp.net")
        ? messages[0]?.key?.remoteJid
        : messages[0]?.key?.participant,
      isGroup: messages[0]?.key?.remoteJid?.endsWith("@g.us") ? true : false,
      isDm: messages[0]?.key?.remoteJid?.endsWith("@s.whatsapp.net")
        ? true
        : false,
      text:
        messages[0]?.message?.conversation ||
        messages[0]?.message?.extendedTextMessage?.text ||
        messages[0]?.message?.imageMessage?.caption ||
        messages[0]?.message?.videoMessage?.caption ||
        messages[0]?.message?.viewOnceMessage?.caption ||
        messages[0]?.message?.viewOnceMessageV2?.caption,
      key: messages[0]?.key?.id || "",
    };

    const helpMessage = `🛡️〓〓🛡️♚ *CASPER BOT* ♔🛡️〓〓🛡️
    ┋ 🏰 *¡Hello ${m.name}* 🏰
    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅
    ┋ 🏞️ *¡Welcome To Useless Bot!*
    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅


    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅
    ┋ 🏰 *¡ Useful Commands !* 🏰
    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅
    ┋➥ ❖⃟⚔ *${usedPrefix}help* - To Get Help
    ┋➥ ❖⃟⚔ *${usedPrefix}advice* - To Get Useful advice
    ┋➥ ❖⃟⚔ *${usedPrefix}timer* - To Create Useful Timer
    ┋➥ ❖⃟⚔ *${usedPrefix}emoji*  - Try it 😉 ( usage : /emoji <emojis>)
    ┋➥ ❖⃟⚔ *${usedPrefix}whoami*  - To Know Who You Are}
    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅


    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅
    ┋ 🏰 *¡ Useless Commands !* 🏰
    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅
    ┋➥ ❖⃟⚔ *${usedPrefix}heyy* - useless (does nothing)}
    ┋➥ ❖⃟⚔ *${usedPrefix}try* - useless (does nothing)}
    ┋➥ ❖⃟⚔ *${usedPrefix}this* - useless (does nothing)}
    ┋┅┅┅┅┅┅┅┅┅┅┅┅┅

    🛡️〓〓🛡️ *CASPER BOT* 🛡️〓〓🛡️`;

    if (messages[0]?.key?.fromMe) {
      return;
    }
    function convertToSeconds(timeString) {
      const regex = /(?:(\d+)([smhd]))/g; // Regex to match numbers followed by s, m, h, or d
      let totalSeconds = 0;
      let match;

      // Loop through all matches
      while ((match = regex.exec(timeString)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
          case "s":
            totalSeconds += value;
            break;
          case "m":
            totalSeconds += value * 60;
            break;
          case "h":
            totalSeconds += value * 3600;
            break;
          case "d":
            totalSeconds += value * 86400;
            break;
          default:
            throw new Error("Invalid time unit. Use s, m, h, or d.");
        }
      }

      return totalSeconds;
    }
    function addHair(input) {
      const emojiRegex = /(\p{Emoji})/gu;
      const bef = `ᥬ`;
      const aff = `᭄`;
      const output = input.replace(emojiRegex, bef + "$1" + aff);

      return output;
    }
    async function sendGif(url, senderId) {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");

      await sock.sendMessage(senderId, {
        video: buffer,
        caption: "hello!",
        gifPlayback: true,
      });
    }
    function removeEmojiTags(input) {
      const regex = /\/emoji(?:hair)?|\/hair|\.hair|\.emoji|\.emojihair/g;
      return input.replace(regex, "");
    }
    if (m?.text?.startsWith("/") || m?.text?.startsWith(".")) {
      const tokens = m.text?.slice(1).split(" ");
      switch (tokens[0].toLowerCase()) {
        case "advice":
          try {
            const res = await fetch("https://api.adviceslip.com/advice");
            const data = await res.json();
            await sock.sendMessage(m.sender, { text: data.slip.advice });
          } catch (e) {
            console.log(e);
          }
          break;
        case "timer":
          if (!tokens[1]) {
            await sock.sendMessage(m.sender, {
              text: "Wrong usage of command\n\tEg: /timer 122s\n\t/timer 43m\n\t/timer 23s33m",
            });
            break;
          }

          try {
            const totalSeconds = convertToSeconds(tokens[1]);
            const gg = await getRandomMessageBusy();
            if (totalSeconds > 0) {
              if (totalSeconds < 15) {
                await sock.sendMessage(m.sender, {
                  text: gg,
                });
              } else {
                await sock.sendMessage(m.sender, {
                  text: `Timer set for ${totalSeconds} seconds.`,
                });
                const randomNumber = Math.floor(Math.random() * 13) + 1;
                const randomMessage = getRandomMessage();
                await sock.sendMessage(m.sender, {
                  text: randomMessage,
                });
              }
            } else {
              await sock.sendMessage(m.sender, {
                text: "Error: No valid time provided.",
              });
            }
          } catch (error) {
            await sock.sendMessage(m.sender, { text: error.message });
          }
          break;
        case "emoji":
        case "emojihair":
        case "hair":
          if (!tokens[1]) {
            await sock.sendMessage(m.sender, {
              text: "Wrong usage of command\n\tEg: /emoji 😉\n\t/emoji 🫣\n\t/emoji hello 🫣",
            });
          } else {
            await sock.sendMessage(m.sender, {
              text: "Adding Hair To Your Emoji...",
            });
            const cleanedMessage = removeEmojiTags(m?.text);
            const result = addHair(cleanedMessage);
            setTimeout(async function () {
              await sock.sendMessage(m.sender, { text: await result });
            }, 2000);
          }
          break;
        case "whoami":
          const mood = getRandomMood();
          await sock.sendMessage(m.sender, {
            text: "I think you are " + mood,
          });
          // setTimeout(async function () {
          //   await sock.sendMessage(m.sender, { text: "result" });
          // }, 2000);
          break;
        case "cat":
          sendGif("https://cataas.com/cat/gif", m.sender);
          break;
        case "help":
          await sock.sendMessage(m.sender, {
            text: helpMessage,
          });
          break;
        case "ai":
          fetchSimTalk(m.text.replace(".ai", "").replace("/ai", "")).then(
            (response) => console.log(response),
          );
          break;
      }
    }
  });
}
connectToWhatsApp();
