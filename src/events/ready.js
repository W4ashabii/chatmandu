const { Events, ActivityType  } = require("discord.js");

let status = [
  {
    name: ".gg/chatmandu",
    type: ActivityType.Watching,
  },
];

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    setInterval(() => {
      let random = Math.floor(Math.random() * status.length);
      client.user.setActivity(status[random]);
    }, 60000);
  },
};
