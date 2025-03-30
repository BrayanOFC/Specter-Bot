import { igdl } from "ruhend-scraper"

let handler = async (m, { args, conn }) => { 
if (!args[0]) {
return conn.reply(m.chat, '★ *Ingresa un link de Instagram*', m, rcanal)}
try {
await m.react(rwait)
conn.reply(m.chat, `✫ *Enviando El Video...*`, m);     
let res = await igdl(args[0])
let data = res.data       
for (let media of data) {
await new Promise(resolve => setTimeout(resolve, 2000))           
await conn.sendFile(m.chat, media.url, 'instagram.mp4', '🎞️ *Tu video de instagram*\n> ' + dev, fkontak)
}} catch {
await m.react(error)
conn.reply(m.chat, '✨ Ocurrió un error.', m, fake)}}

handler.command = ['igdl', 'ig']
handler.tags = ['dl']
handler.help = ['igdl']
handler.register = true

export default handler