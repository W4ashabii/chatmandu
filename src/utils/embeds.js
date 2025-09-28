const { MessageEmbed } = require('discord.js');

function welcomeMessage(member) {
  const embed = new MessageEmbed()
    .setColor('#00FF00')
    .setTitle('Welcome to the server!')
    .setDescription(`Hey ${member}, welcome to our awesome Discord server!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Joined at ${member.joinedAt.toLocaleString()}` });
  return embed;
}

module.exports = {
  welcomeMessage,
};
