const {
  SlashCommandBuilder,
  EntitlementManager,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const {
  EntanglementDrive,
  CasinoHQ,
  GuildHQ,
  UserHQ,
  PermManager,
} = require("../dataCrusher/Headquarters");
const { ErrorEmbed } = require("../utils/embedUtil");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("casino")
    .setDescription(
      "The Fun Commands of ECON, place your bet and see how much you make."
    )

    //  Slot Machine
    .addSubcommand((subCmd) =>
      subCmd
        .setName("play-slots")
        .setDescription("Play a round of slots machines.")
        .addNumberOption((numOp) =>
          numOp
            .setName("bet")
            .setDescription("The amount you'd like to bet.")
            .setRequired(true)
        )
    )
    //  Blackjack
    .addSubcommand((subCmd) =>
      subCmd
        .setName("play-blackjack")
        .setDescription("Play a round of blackjack.")
        .addNumberOption((numOp) =>
          numOp
            .setName("bet")
            .setDescription("The amount you'd like to bet.")
            .setRequired(true)
        )
    )
    // Module Availability
    .addSubcommand((subCmd) =>
      subCmd
        .setName("set-enabled")
        .setDescription("Enables (Or Disables) Casino Commands.")
        .addBooleanOption((boolOp) =>
          boolOp
            .setName("value")
            .setDescription("True To Enable Casino, False To Disable.")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    try {
      switch (interaction.options.getSubcommand()) {
        case "set-enabled": {
          if (
            (await PermManager.Treasury.checkAuthorization(
              interaction,
              interaction.user
            )) == null &&
            interaction.user.id !== interaction.guild.ownerId
          ) {
            return await ErrorEmbed(
              interaction,
              "You are not authorized manage this setting."
            );
          }
          const guildManager = new GuildHQ(interaction);
          const boolOp = interaction.options.getBoolean("value");

          await guildManager.setCasinoEnbaled(boolOp);

          const embedSuc = new EmbedBuilder()
            .setDescription("Successfully updated ECON Casino.")
            .setColor("Green");

          interaction.reply({ embeds: [embedSuc] });

          break;
        }
        case "play-blackjack": {
          const guildManager = new GuildHQ(interaction);
          const casinoStatus = await guildManager.getCasinoStatus();

          if (!casinoStatus) {
            throw new Error("Casino Is Not Enabled.");
          }

          const bet = interaction.options.getNumber("bet");
          const Casino = new CasinoHQ(interaction, guildManager);
          const userManager = new UserHQ(interaction, interaction.user.id);

          let results = await Casino.playBlackJack(bet, interaction);

          if (results[2] === true) {
            return;
          }

          if (results[0] == true) {
            userManager.claimCasinoWinnings(Number(results[1]));
            return;
          }

          userManager.payCasino(Number(results[1]));

          return;
          break;
        }
        case "play-slots": {
          const guildManager = new GuildHQ(interaction);
          const casinoStatus = await guildManager.getCasinoStatus();

          if (!casinoStatus) {
            throw new Error("Casino Is Not Enabled.");
          }

          const bet = interaction.options.getNumber("bet");
          const Casino = new CasinoHQ(interaction, guildManager);
          const userManager = new UserHQ(interaction, interaction.user.id);

          let slotsPlay = await Casino.playSlots(bet);

          let resultEmbed = new EmbedBuilder()
            .setTitle("ECON Casino")
            .setDescription(
              `
                        ${slotsPlay.play[0].symbol} | ${slotsPlay.play[1].symbol} | ${slotsPlay.play[2].symbol}
                        `
            )
            .addFields(
              { name: "Result", value: slotsPlay.result, inline: true },
              {
                name: "Reward",
                value: await guildManager.formatMoney(slotsPlay.amount),
                inline: true,
              }
            );

          if (slotsPlay.result === "LOSS") {
            resultEmbed.setColor("Red");
            await userManager.payCasino(bet);
          } else {
            resultEmbed.setColor("Green");
            await userManager.claimCasinoWinnings(slotsPlay.amount);
          }
          await interaction.reply({ embeds: [resultEmbed] });

          break;
        }
      }
    } catch (err) {
      console.log(err);
      return await ErrorEmbed(interaction, err.message, false, false);
    }
  },
};
