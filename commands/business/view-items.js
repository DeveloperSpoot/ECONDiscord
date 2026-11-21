const getActiveEntity = require("../../DRY/getActiveEntity");
const { paginateUtil2 } = require("../../utils/paginateUtil2");
const {GuildHQ} = require("../../dataCrusher/Headquarters")
const {
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder, EmbedBuilder,
} = require("discord.js");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("view-items")
            .setDescription("Used by members to view items of a business.")
    },

    async execute(interaction) {
        const [ business, busName ] = await getActiveEntity.Business(interaction)

        if (business == null) return;

        await interaction.deferReply();

        const guildManager = new GuildHQ(interaction);

        const ITEMS = await business.getAllItems();

        const paginatedItems = await paginateUtil2(ITEMS, "IDENT", 10);

        let currentPage = 1;

        let firstDesc = await pageDescription(paginatedItems[currentPage]);

        if (ITEMS.length == 0) { firstDesc = "This Business Has No Items." }

        let pageEmbed = new EmbedBuilder()
            .setTitle(`${busName} Items`)
            .setColor("#fcff63")
            .setFooter({
                text: `Taxes not included • ${currentPage}/${paginatedItems.length - 1
                    }`,
            })
            .setDescription(firstDesc);

        const next = new ButtonBuilder()
            .setCustomId("next")
            .setLabel("-->")
            .setStyle(ButtonStyle.Secondary);

        const back = new ButtonBuilder()
            .setCustomId("back")
            .setLabel("<--")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(back, next);

        const respFilter = (i) => i.user.id === interaction.user.id;

        if (currentPage === paginatedItems.length - 1) {
            next.setDisabled(true);
        }

        const buttonCollector =
            interaction.channel.createMessageComponentCollector({
                respFilter,
                time: 1250000,
            });
        await interaction.editReply({ embeds: [pageEmbed], components: [row] });

        async function pageDescription(page) {
            let description = "";

            for (const key of page.keys()) {
                let value = await page.get(key);
                let price = await guildManager.formatMoney(value.price);

                description =
                    description +
                    `**${value.name}** - ${price}\n *${value.description}*\n\n`;
            }

            return description;
        }

        buttonCollector.on("collect", async (i) => {
            switch (i.customId) {
                case "next": {
                    currentPage++;
                    let desc = await pageDescription(paginatedItems[currentPage]);

                    pageEmbed.setDescription(desc);
                    pageEmbed.setFooter({
                        text: `Taxes not included • ${currentPage}/${paginatedItems.length - 1
                            }`,
                    });

                    if (currentPage === paginatedItems.length - 1) {
                        next.setDisabled(true);
                        back.setDisabled(false);
                    } else {
                        next.setDisabled(false);
                        back.setDisabled(false);
                    }

                    await i.update({ embeds: [pageEmbed], components: [row] });
                    break;
                }

                case "back": {
                    currentPage--;
                    let desc = await pageDescription(paginatedItems[currentPage]);

                    pageEmbed.setDescription(desc);
                    pageEmbed.setFooter({
                        text: `Taxes not included • ${currentPage}/${paginatedItems.length - 1
                            }`,
                    });

                    if (currentPage === 1) {
                        back.setDisabled(true);
                        next.setDisabled(false);
                    } else {
                        next.setDisabled(false);
                        back.setDisabled(false);
                    }

                    await i.update({ embeds: [pageEmbed], components: [row] });
                    break;
                }
            }
        });

    }
};