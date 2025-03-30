var handler = async (m, { conn, args, text, usedPrefix, command }) => {
    let who;

    // Verificamos si es un mensaje de grupo
    if (m.isGroup) {
        // Si hay menciones, tomar el primer mencionado, sino el remitente del mensaje o el texto
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    // Obtener el nombre del usuario que envió el mensaje
    let name = await conn.getName(m.sender);
    let user = global.db.data.users[who];
    let nom = await conn.getName(m.sender);

    // Verificar si las restricciones están activadas
    if (!global.db.data.settings[conn.user.jid].restrict) {
        return conn.reply(m.chat, `🚩 *Este comando está deshabilitado por mi creador*`, m);
    }

    // Verificar si no se ha ingresado un número para añadir
    if (!text) {
        return await m.reply(`🍟 Ingrese el número de la persona que quieres añadir a este grupo.\n\n🚩 Ejemplo:\n*${usedPrefix + command}* 66666666666`);
    }

    // Verificar si el texto contiene el símbolo '+' (no se permite)
    if (text.includes('+')) {
        return await m.reply(`🍟 Ingrese el número todo junto sin el *(+)*`);
    }

    // Obtener el enlace de invitación al grupo
    let group = m.chat;
    let link = 'https://chat.whatsapp.com/' + await conn.groupInviteCode(group);

    // Enviar la invitación al número privado
    await conn.reply(text + '@s.whatsapp.net', `*🍟 Hola, Una persona te ha invitado a su grupo.*\n\n*Link*\n${link}`, m, { mentions: [text + '@s.whatsapp.net'] });
    await m.reply(`🍟 *Enviando la invitación al privado de ${nom}*`);
};

handler.help = ['add *<número>*'];
handler.tags = ['group'];
handler.command = ['add', 'agregar', 'añadir'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;
handler.fail = null;

export default handler;