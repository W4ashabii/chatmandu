const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Provides information about the server."),
  async execute(interaction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle(interaction.guild.name)
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .addFields({
            name: "Member Count",
            value: interaction?.guild?.memberCount.toString(),
            inline: true,
          })
          .addFields({
            name: "Role Count",
            value: interaction.guild.roles.cache.size.toString(),
            inline: true,
          })
          .addFields({
            name: "Vanity URL",
            value: interaction.guild.vanityURLCode
              ? `https://discord.gg/${interaction.guild.vanityURLCode}`
              : "None",
          })
          .addFields({
            name: "Server Owner",
            value: "<@866694286006288395>"
          })
          .setTimestamp()
          .setFooter({
            text: "Chatmandu Bot",
            iconURL:
              "https://images-ext-1.discordapp.net/external/f1tn-LE_EvySwmkymL264Izopx06GmnnjOxD0KtxiMM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1169608414352121886/ae62814f93ca817f4decbbb448018301.png?format=webp&quality=lossless&width=281&height=281",
          }),
      ],
    });
  },
};
