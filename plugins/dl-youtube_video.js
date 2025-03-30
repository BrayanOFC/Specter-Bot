import fg from 'senna-fg';

let handler = async(m, { conn, args, text }) => {

if (!text) return m.reply(`★ Ingresa Un Link De YouTube`);

m.react(rwait);

let data = await fg.ytmp4(text);
let url = data.dl_url;

if (!url) return m.reply('《✧》Hubo un error al intentar acceder al link.\n> Si el problema persiste, reportalo en el grupo de soporte.');

await conn.sendMessage(m.chat, {
      video: { url: url },
      mimetype: "video/mp4",
      caption: `${dev}`,
    }, { quoted: m });
    m.react(done);
 }

handler.help = ['ytmp4'];
handler.tag = ['dl'];
handler.command = ['ytmp4', 'mp4']

export default handler;