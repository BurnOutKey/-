const regionInfo = require("./regionInfo")

const Discord = require("discord.js");a
const fetch = require("node-fetch");

const client = new Discord.Client({
  intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES],
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

let trackInt, startedInt;

client.on("message", async (msg) => {
  if (!msg.content.startsWith("/") || msg.author.bot) return;

  if(msg.channel?.id !== "1271538183196381256") return

msg.embed = function(title, description) {
  const embed = new Discord.MessageEmbed().setColor("#1e1f22").setTitle(title);
  if (description) embed.setDescription(description);

  this.channel.send(embed)
    .then(() => console.log('Embed sent successfully'))
    .catch(error => console.error('Error sending embed:', error));
}

  const args = msg.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "ping") return msg.embed("pong");

  if (command === "track") {
   let firstRun = !startedInt;
   startedInt = firstRun;


  msg.embed(`Tracker`, `all servers 40/40 player tracker is ${startedInt ? "online" : "offline"}`);

if (startedInt) {
    // If starting, update immediately and set interval
    updateServers(msg, true);
    trackInt = setInterval(() => updateServers(msg), 10e3);
  } else {
    // If stopping, clear the interval
    clearInterval(trackInt);
  }
  }

  if (command === "players") {
    let [ url ] = args;

    if(!url) return msg.embed("provide url/type", "/players url or dev sand default")
    
    const isUrl = url.startsWith("http");

    if(!isUrl && !["dev", "sandbox", "default", "sand"].includes(url)) return msg.embed("wrong url/type", "/players dev sand default")

    if(isUrl) {
      let server = await findServer(msg, url);

      if(!server) return

      let keys = server[1].split(":");
      if(!server[0]) return msg.embed(`server ${server[1]} not found`);

      const serverType = regionInfo[keys[0]];

      if(!serverType) return msg.embed(`server type of ${keys[0]} not found`);

      return msg.embed(`${serverType.name} ${keys[1]}`, `${server[0].playerCount}/${server[0].playerCapacity}`);
    }

    let parent = url.includes("dev") ? "dev" : url.includes("sand") ? "sandbox" : "default";
    let serverData = await fetchServers(url);
    
    if(!serverData) return msg.embed(`fetch failed`)

    let servers = {
      playerCount: 0,
      playerCapacity: 0
    }

    serverData.forEach((server) => {
      servers.playerCount += server.playerCount;
      servers.playerCapacity += server.playerCapacity;
    })

    msg.embed(`${parent}${parent !== "default" ? ".":""}moomoo.io`, `${servers.playerCount}/${servers.playerCapacity}`);
  }

  if (command === "remove") {
    const [url] = args;

    if(!url) return msg.embed("wrong url", "/remove url");
    if (!url.startsWith("http") || !url.includes(":") || url.length > 80)
      return msg.embed("wrong url", "/remove url");

    let server = await findServer(msg, url);

      if(!server) return

      let keys = server[1].split(":");
      if(!server[0]) return msg.embed(`server ${server[1]} not found`);

      const serverType = regionInfo[keys[0]];

      if(!serverType) return msg.embed(`server type of ${keys[0]} not found`);

    msg.embed(`${serverType.name} ${keys[1]}`, `removing ${server[0].playerCapacity - server[0].playerCount} bots`)
    bots.remove(server[1])
  }

  if (command === "fill") {
    const [url] = args;

    if (!url || !url.startsWith("http") || !url.includes(":") || url.length > 80)
      return msg.embed("wrong url", "/remove url");

    let server = await findServer(msg, url);

      if(!server) return

      let keys = server[1].split(":");
      if(!server[0]) return msg.embed(`server ${server[1]} not found`);

      const serverType = regionInfo[keys[0]];

      if(!serverType) return msg.embed(`server type of ${keys[0]} not found`);

    const full = server[0].playerCount === server[0].playerCapacity

    if(full) return msg.embed(`${serverType.name} ${keys[1]}`, `server is full`);

    msg.embed(`${serverType.name} ${keys[1]}`, `${server[0].playerCapacity - server[0].playerCount} bots joining`)
    bots.fill(server[1])
  }
});

client.login(process.env.token);

const findServer = async (msg, url, amount) => {
  let parent = url.includes("dev") ? "dev" : url.includes("sandbox") ? "sandbox" : "default",
      key = url.split("?server=")
  
  if(!key || !key.length) return msg.embed("wrong server key");
  key = key[1].replace(":", ".");

  if(!key) return msg.embed("wrong server key");
  const serverData = await fetchServers(parent);

  if(!serverData) return msg.embed("fetch failed");

  const server = serverData.find(server => {
    console.log(`${server.region}.${server.name}`, key)
    return `${server.region}.${server.name}` === key
  });
  
  if(!server) return msg.embed(`invalid key ${key}`);
  key = key.replace(".", ":");
  
  return [server, key];
};

class Bots {
  constructor(){}

  fill(server) {
    console.log("filling", server)
  }

  remove(server) {
    console.log("removing", server)
  }
}

const bots = new Bots();

const fetchServers = async (parent) => {
  if(parent === "sand") parent = "sandbox"
    try {
      let url = "";

      switch (parent) {
        case "sandbox":
          url = "https://api-sandbox.moomoo.io";
          break;
        case "dev":
          url = "https://api-dev.moomoo.io";
          break;
        default:
          url = "https://api.moomoo.io";
          break;
      }

      return await fetch(`${url}/servers?v=1.22`).then((res) => res.json());
    } catch (e) {}
  
  return null;
  }

let fullServers = [];
let serverStorage = [];

const updateServers = async (msg, firstRun) => {
  const Dev = await fetchServers("dev");
  const Sand = await fetchServers("sand");
  const Default = await fetchServers("");

  serverStorage["dev"] = Dev;
  serverStorage["sandbox"] = Sand;
  serverStorage["default"] = Default;
  
  let keys = Object.keys(serverStorage);

  if(!keys?.length) return

  let oldFull = Object.assign([], fullServers);
  fullServers = [];

  for(let index in keys) {
    let key = keys[index];
    let type = serverStorage[key];

    if(type) {
      for(let index2 in type) {
          const server = type[index2];

        if(server && server.playerCount === server.playerCapacity) {
          const str = `${key !== "default" ? `[${key}] ` : ""}${regionInfo[server.region]?.name} ${server.region}:${server.name}`;

         fullServers.push(str);
        }
      }
    }
  }

  console.log(oldFull, fullServers)
  const newFull = fullServers.filter((str) => {
    return !oldFull.includes(str);
  })

  newFull.forEach((str) => {
    !oldFull.includes(str) && msg.embed(firstRun ? `server been full` : `new full server`, str)
  });
}
