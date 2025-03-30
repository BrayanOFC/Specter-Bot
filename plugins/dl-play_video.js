import fetch from 'node-fetch';
import fg from 'senna-fg';

let handler = async(m, { conn, usedPrefix, command, text }) => {

if (!text) return m.reply(`★ Ingresa Un Texto Para Buscar Tu Vídeo En Youtube.`);

try {
let api = await (await fetch(`https://delirius-apiofc.vercel.app/search/ytsearch?q=${text}`)).json();

let results = api.data[0];

let txt = `✨ *Título:* ${results.title}\n⌛ *Duración:* ${results.duration}\n📎 *Link:* ${results.url}\n📆 *Publicado:* ${results.publishedAt}`;

let img = results.image;

m.react('🕒');
conn.sendMessage(m.chat, { image: { url: img }, caption: txt }, { quoted: m });

let data = await fg.ytmp4(results.url);
let url = data.dl_url;

await conn.sendMessage(m.chat, { document: { url: url }, fileName: `${results.title}.mp4`, caption: `> ${wm}`, mimetype: 'video/mp4' }, { quoted: m })
m.react('✅');     

} catch (e) {
m.reply(`Error: ${e.message}`);
m.react('✖️');
  }
}

handler.tag = ['dl'];
handler.help = ['pvideo'];
handler.command = ['pvideo', 'play2'];

export default handler