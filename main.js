process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, statSync, unlinkSync, existsSync, mkdirSync, readFileSync, rmSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import { vegetaJadiBot } from './plugins/jadibot-serbot.js'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import { tmpdir } from 'os'
import { format } from 'util'
import boxen from 'boxen'
import P from 'pino'
import pino from 'pino'
import Pino from 'pino'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import { mongoDB, mongoDBV2 } from './lib/mongoDB.js'
import store from './lib/store.js'
const { proto } = (await import('@whiskeysockets/baileys')).default
const { DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, PHONENUMBER_MCC } = await import('@whiskeysockets/baileys')
import readline from 'readline'
import NodeCache from 'node-cache'
const { CONNECTING } = ws
const { chain } = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

protoType()
serialize()

// Definiciones provisionales para variables globales
const sessions = "sessions"
const jadi = "JadiBots"

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
}
global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}
global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

global.API = (name, path = '/', query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) + path +
  (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '');

global.timestamp = { start: new Date }

const __dirnameVar = global.__dirname(import.meta.url)

global.opts = Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[#/!.]')

global.db = new Low(/https?:\/\//.test(global.opts['db'] || '') ? new cloudDBAdapter(global.opts['db']) : new JSONFile('src/database/database.json'))
global.DATABASE = global.db 
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) => setInterval(async function() {
      if (!global.db.READ) {
        clearInterval(this)
        resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
      }
    }, 1000))
  }
  if (global.db.data !== null) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    ...(global.db.data || {}),
  }
  global.db.chain = chain(global.db.data)
}
loadDatabase()

const { state, saveState, saveCreds } = await useMultiFileAuthState(global.sessions)
const msgRetryCounterMap = (MessageRetryMap) => { }
const msgRetryCounterCache = new NodeCache()
const { version } = await fetchLatestBaileysVersion();
let phoneNumber = global.botNumberCode

const methodCodeQR = process.argv.includes("qr")
const methodCode = !!phoneNumber || process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")
const colores = chalk.bgMagenta.white
const opcionQR = chalk.bold.green
const opcionTexto = chalk.bold.cyan
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

let opcion
if (methodCodeQR) {
  opcion = '1'
}
if (!methodCodeQR && !methodCode && !fs.existsSync(`./${sessions}/creds.json`)) {
  do {
    opcion = await question(colores('Seleccione una opción:\n') + opcionQR('1. Con código QR\n') + opcionTexto('2. Con código de texto de 8 dígitos\n--> '))
    if (!/^[1-2]$/.test(opcion)) {
      console.log(chalk.bold.redBright(`🍬 No se permiten números que no sean 1 o 2, tampoco letras o símbolos especiales.`))
    }
  } while ((opcion !== '1' && opcion !== '2') || fs.existsSync(`./${sessions}/creds.json`))
}

const filterStrings = [
  "Q2xvc2luZyBzdGFsZSBvcGVu",
  "Q2xvc2luZyBvcGVuIHNlc3Npb24=",
  "RmFpbGVkIHRvIGRlY3J5cHQ=",
  "U2Vzc2lvbiBlcnJvcg==",
  "RXJyb3I6IEJhZCBNQUM=",
  "RGVjcnlwdGVkIG1lc3NhZ2U="
]

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion == '1' ? true : methodCodeQR ? true : false,
  mobile: MethodMobile, 
  browser: opcion == '1' ? ['Vegeta-Bot-MB', 'Edge', '20.0.04'] : methodCodeQR ? ['Vegeta-Bot-MB', 'Edge', '20.0.04'] : ["Ubuntu", "Chrome", "20.0.04"],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
  },
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  getMessage: async (clave) => {
    let jid = jidNormalizedUser(clave.remoteJid);
    let msg = await store.loadMessage(jid, clave.id);
    return msg?.message || "";
  },
  msgRetryCounterCache,
  msgRetryCounterMap,
  defaultQueryTimeoutMs: undefined,
  version: [2, 3000, 1015901307]
};

global.conn = makeWASocket(connectionOptions);

if (!fs.existsSync(`./${sessions}/creds.json`)) {
  if (opcion === '2' || methodCode) {
    opcion = '2'
    if (!global.conn.authState.creds.registered) {  
      if (MethodMobile) throw new Error('No se puede usar un código de emparejamiento con la API móvil')
      let numeroTelefono
      if (!!phoneNumber) {
        numeroTelefono = phoneNumber.replace(/[^0-9]/g, '')
        if (!Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
          console.log(chalk.bgBlack(chalk.bold.greenBright(`👻 Por favor, Ingrese el número de WhatsApp.\n${chalk.bold.yellowBright(`👀  Ejemplo: 57321×××××××`)}\n${chalk.bold.magentaBright('---> ')}`)))
          process.exit(0)
        }
      } else {
        while (true) {
          numeroTelefono = await question(chalk.bgBlack(chalk.bold.greenBright(`👻 Por favor, escriba su número de WhatsApp.\n👀  Ejemplo: 57321×××××××\n`)))
          numeroTelefono = numeroTelefono.replace(/[^0-9]/g, '')
          if (numeroTelefono.match(/^\d+$/) && Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
            break 
          } else {
            console.log(chalk.bgBlack(chalk.bold.greenBright(`👻 Por favor, escriba su número de WhatsApp.\n  👀Ejemplo: 57321×××××××\n`)))
          }
        }
        rl.close()  
      } 
      setTimeout(async () => {
        let codigo = await global.conn.requestPairingCode(numeroTelefono)
        codigo = codigo?.match(/.{1,4}/g)?.join("-") || codigo
        console.log(chalk.bold.white(chalk.bgMagenta(`〽️ CÓDIGO DE VINCULACIÓN 〽️`)), chalk.bold.white(codigo))
      }, 3000)
    }
  }
}

global.conn.isInit = false;
global.conn.well = false;

if (!global.opts['test']) {
  if (global.db) setInterval(async () => {
    if (global.db.data) await global.db.write()
    if (global.opts['autocleartmp'] && (global.support || {}).find) {
      const tmpPaths = [tmpdir(), 'tmp', `${jadi}`]
      tmpPaths.forEach((filename) => spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete']));
    }
  }, 30 * 1000);
}

if (global.opts['server']) (await import('./server.js')).default(global.conn, PORT);

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin } = update;
  global.stopped = connection;
  if (isNewLogin) global.conn.isInit = true;
  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && global.conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();
  if ((update.qr != 0 && update.qr != undefined) || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      console.log(chalk.bold.yellow(`\n🍇 ESCANEA EL CÓDIGO QR EXPIRA EN 45 SEGUNDOS`))
    }
  }
  if (connection == 'open') {
    console.log(boxen(chalk.bold(' ¡CONECTADO CON WHATSAPP! '), { borderStyle: 'round', borderColor: 'green', title: chalk.green.bold('● CONEXIÓN ●') }))
    await joinChannels(global.conn)
  }
  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
  if (connection === 'close') {
    if (reason === DisconnectReason.badSession) {
      console.log(chalk.bold.cyanBright(`\n⚠️ SIN CONEXIÓN, BORRE LA CARPETA ${global.sessions} Y ESCANEA EL CÓDIGO QR ⚠️`))
    } else if (reason === DisconnectReason.connectionClosed) {
      console.log(chalk.bold.magentaBright(`\n╭──────────── • • • ──────────── ☹\n┆ ⚠️ CONEXIÓN CERRADA, RECONECTANDO....\n╰──────────── • • • ──────────── ☹`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.connectionLost) {
      console.log(chalk.bold.blueBright(`\n╭──────────── • • • ──────────── ☂\n┆ ⚠️ CONEXIÓN PERDIDA CON EL SERVIDOR, RECONECTANDO....\n╰──────────── • • • ──────────── ☂`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.connectionReplaced) {
      console.log(chalk.bold.yellowBright(`\n╭──────────── • • • ──────────── ✗\n┆ ⚠️ CONEXIÓN REEMPLAZADA, SE HA ABIERTO OTRA SESIÓN, CIERRA LA ACTUAL PRIMERO.\n╰──────────── • • • ──────────── ✗`))
    } else if (reason === DisconnectReason.loggedOut) {
      console.log(chalk.bold.redBright(`\n⚠️ SIN CONEXIÓN, BORRE LA CARPETA ${global.sessions} Y ESCANEA EL CÓDIGO QR ⚠️`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.restartRequired) {
      console.log(chalk.bold.cyanBright(`\n╭──────────── • • • ──────────── ✓\n┆ 🏞️ CONECTANDO AL SERVIDOR...\n╰──────────── • • • ──────────── ✓`))
      await global.reloadHandler(true).catch(console.error)
    } else if (reason === DisconnectReason.timedOut) {
      console.log(chalk.bold.yellowBright(`\n╭──────────── • • • ──────────── ▸\n┆ ⌛ TIEMPO DE CONEXIÓN AGOTADO, RECONECTANDO....\n╰──────────── • • • ──────────── ▸`))
      await global.reloadHandler(true).catch(console.error)
    } else {
      console.log(chalk.bold.redBright(`\n⚠️❗ RAZÓN DE DESCONEXIÓN DESCONOCIDA: ${reason || 'No encontrado'} >> ${connection || 'No encontrado'}`))
    }
  }
}
process.on('uncaughtException', console.error)

let isInit = true;
let handler = await import('./handler.js')
global.reloadHandler = async function(restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
    if (Object.keys(Handler || {}).length) handler = Handler
  } catch (e) {
    console.error(e);
  }
  if (restatConn) {
    const oldChats = global.conn.chats
    try {
      global.conn.ws.close()
    } catch { }
    global.conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    isInit = true
  }
  if (!isInit) {
    global.conn.ev.off('messages.upsert', global.conn.handler)
    global.conn.ev.off('connection.update', global.conn.connectionUpdate)
    global.conn.ev.off('creds.update', global.conn.credsUpdate)
  }
  global.conn.handler = handler.handler.bind(global.conn)
  global.conn.connectionUpdate = connectionUpdate.bind(global.conn)
  global.conn.credsUpdate = saveCreds.bind(global.conn, true)
  global.conn.ev.on('messages.upsert', global.conn.handler)
  global.conn.ev.on('connection.update', global.conn.connectionUpdate)
  global.conn.ev.on('creds.update', global.conn.credsUpdate)
  isInit = false
  return true
};

global.rutaJadiBot = join(__dirnameVar, './JadiBots')

if (global.vegetaJadibts) {
  if (!existsSync(global.rutaJadiBot)) {
    mkdirSync(global.rutaJadiBot, { recursive: true }) 
    console.log(chalk.bold.cyan(`La carpeta: ${jadi} se creó correctamente.`))
  } else {
    console.log(chalk.bold.cyan(`La carpeta: ${jadi} ya está creada.`))
  }
  const readRutaJadiBot = readdirSync(global.rutaJadiBot)
  if (readRutaJadiBot.length > 0) {
    const creds = 'creds.json'
    for (const gjbts of readRutaJadiBot) {
      const botPath = join(global.rutaJadiBot, gjbts)
      const readBotPath = readdirSync(botPath)
      if (readBotPath.includes(creds)) {
        vegetaJadiBot({ pathvegetaJadiBot: botPath, m: null, conn: global.conn, args: '', usedPrefix: '/', command: 'serbot' })
      }
    }
  }
}

const pluginFolder = global.__dirname(join(__dirnameVar, './plugins/index'))
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}
async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename))
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      global.conn.logger.error(e)
      delete global.plugins[filename]
    }
  }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error);

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const dir = global.__filename(join(pluginFolder, filename), true);
    if (filename in global.plugins) {
      if (existsSync(dir)) global.conn.logger.info(` updated plugin - '${filename}'`)
      else {
        global.conn.logger.warn(`deleted plugin - '${filename}'`)
        return delete global.plugins[filename]
      }
    } else global.conn.logger.info(`new plugin - '${filename}'`);
    const err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
    });
    if (err) global.conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`)
    else {
      try {
        const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`));
        global.plugins[filename] = module.default || module;
      } catch (e) {
        global.conn.logger.error(`error require plugin '${filename}\n${format(e)}'`)
      } finally {
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
      }
    }
  }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()

async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version']),
  ].map((p) => {
    return Promise.race([
      new Promise((resolve) => {
        p.on('close', (code) => {
          resolve(code !== 127);
        });
      }),
      new Promise((resolve) => {
        p.on('error', (_) => resolve(false));
      })
    ]);
  }));
  const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
  const s = global.support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find };
  Object.freeze(global.support);
}

function clearTmp() {
  const tmpDir = join(__dirnameVar, 'tmp')
  const filenames = readdirSync(tmpDir)
  filenames.forEach(file => {
    const filePath = join(tmpDir, file)
    unlinkSync(filePath)
  })
}

function purgeSession() {
  let prekey = []
  let directorio = readdirSync(`./${sessions}`)
  let filesFolderPreKeys = directorio.filter(file => file.startsWith('pre-key-'))
  prekey = [...prekey, ...filesFolderPreKeys]
  filesFolderPreKeys.forEach(file => {
    unlinkSync(`./${sessions}/${file}`)
  })
} 

function purgeSessionSB() {
  try {
    const listaDirectorios = readdirSync(`./${jadi}/`);
    let SBprekey = [];
    listaDirectorios.forEach(directorio => {
      if (statSync(`./${jadi}/${directorio}`).isDirectory()) {
        const DSBPreKeys = readdirSync(`./${jadi}/${directorio}`).filter(fileInDir => fileInDir.startsWith('pre-key-'))
        SBprekey = [...SBprekey, ...DSBPreKeys];
        DSBPreKeys.forEach(fileInDir => {
          if (fileInDir !== 'creds.json') {
            unlinkSync(`./${jadi}/${directorio}/${fileInDir}`)
          }
        })
      }
    })
    if (SBprekey.length === 0) {
      console.log(chalk.bold.green(`\n╭» 🟡 ${jadi} 🟡\n│→ NADA POR ELIMINAR \n╰──────────────────── 🗑️♻️`))
    } else {
      console.log(chalk.bold.cyanBright(`\n╭» ⚪ ${jadi} ⚪\n│→ ARCHIVOS NO ESENCIALES ELIMINADOS\n╰──────────────────── 🗑️♻️`))
    }
  } catch (err) {
    console.log(chalk.bold.red(`\n╭» 🔴 ${jadi} 🔴\n│→ OCURRIÓ UN ERROR\n╰──────────────────── 🗑️♻️\n` + err))
  }
}

function purgeOldFiles() {
  const directories = [`./${sessions}/`, `./${jadi}/`]
  directories.forEach(dir => {
    if (existsSync(dir)) {
      const files = readdirSync(dir)
      files.forEach(file => {
        if (file !== 'creds.json') {
          const filePath = path.join(dir, file)
          try {
            unlinkSync(filePath)
            console.log(chalk.bold.green(`Archivo ${file} borrado con éxito`))
          } catch (err) {
            console.log(chalk.bold.red(`No se logró borrar ${file}: ${err}`))
          }
        }
      })
    }
  })
}

function redefineConsoleMethod(methodName, filterStrings) {
  const originalConsoleMethod = console[methodName]
  console[methodName] = function() {
    const message = arguments[0]
    if (typeof message === 'string' && filterStrings.some(filterString => message.includes(atob(filterString)))) {
      arguments[0] = ""
    }
    originalConsoleMethod.apply(console, arguments)
  }
}

setInterval(async () => {
  if (global.stopped === 'close' || !global.conn || !global.conn.user) return
  clearTmp()
  console.log(chalk.bold.cyanBright(`\n╭» 🟢 MULTIMEDIA 🟢\n│→ ARCHIVOS DE LA CARPETA TMP ELIMINADOS\n╰──────────────────── 🗑️♻️`))
}, 1000 * 60 * 4)

setInterval(async () => {
  if (global.stopped === 'close' || !global.conn || !global.conn.user) return
  purgeSession()
  console.log(chalk.bold.cyanBright(`\n╭» 🔵 ${global.sessions} 🔵\n│→ SESIONES NO ESENCIALES ELIMINADAS\n╰──────────────────── 🗑️♻️`))
}, 1000 * 60 * 10)

setInterval(async () => {
  if (global.stopped === 'close' || !global.conn || !global.conn.user) return
  purgeSessionSB()
}, 1000 * 60 * 10)

setInterval(async () => {
  if (global.stopped === 'close' || !global.conn || !global.conn.user) return
  purgeOldFiles()
  console.log(chalk.bold.cyanBright(`\n╭» 🟠 ARCHIVOS 🟠\n│→ ARCHIVOS RESIDUALES ELIMINADOS\n╰──────────────────── 🗑️♻️`))
}, 1000 * 60 * 10)

_quickTest().then(() => global.conn.logger.info(chalk.bold(`🍬  H E C H O\n`.trim()))).catch(console.error)

async function joinChannels(conn) {
  for (const channelId of Object.values(global.ch || {})) {
    await conn.newsletterFollow(channelId).catch(() => {})
  }
    }