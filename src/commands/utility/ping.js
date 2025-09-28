const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction) {
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor("#00FF00").setTitle("Pong!!!")],
    });
  },
};
