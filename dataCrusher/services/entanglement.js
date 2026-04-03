const {entanglementCodes, entanglementCache} = require("./cache");
const SQL = require("../Server");
const {colorEmbed} = require("../../customPackage/colorBar");

async function LogGeneral(interaction, color, title, description, ...fields){
    const [ColorEmbed] = await colorEmbed(interaction, color, title, description, ...fields)

    let GuildChannel =  (await SQL.models.Guilds.findByPk(String(interaction.guild.id), {raw: true}));

    if(GuildChannel.generalLogChannel != null && GuildChannel.generalLogChannel){
        try{
            GuildChannel =  await interaction.guild.channels.fetch(GuildChannel.generalLogChannel);
        }catch(err){
            return
        }
        await GuildChannel.send({embeds: [ColorEmbed]})
    }

}
function Entanglement(interaction){
    this.interaction = interaction;
    this.IDENT = interaction.guildId;
}

Entanglement.prototype = {
    generateEntanglementCode: async function(){
        const currentETG = await this.getEntanglement()
        if(currentETG !== false){
            throw new Error("This server is currently entangled with another server. This server is unable to host entanglement.")
        }

        let newEntanglementCode = "";

        for(let i = 1; i < 7; i++){


            if(i%2 === 0){
                let randomNumber = Math.floor(Math.random()*10);

                newEntanglementCode = `${newEntanglementCode}${randomNumber}`
            }else{
                let randomNumber = Math.floor(Math.random()*25)+1;
                let letter = (String.fromCharCode(97 + randomNumber)).toUpperCase();
                newEntanglementCode = `${newEntanglementCode}${letter}`
            }

            if(i === 3){
                newEntanglementCode = `${newEntanglementCode}-`
            }
        }

        await entanglementCodes.set(newEntanglementCode, {IDENT: this.IDENT, name: this.interaction.guild.name});

        return newEntanglementCode;
    },
    ETGJoin: async function(ETG_CODE){
        const currentETG = await this.getEntanglement()
        if(currentETG !== false){
            throw new Error("This server is already entangled with another server. You must disengage the current entanglement before attempting to join a new one.")
        }


        let ETG_ENTITY= await entanglementCodes.get(ETG_CODE);

        if(!ETG_ENTITY){
            throw new Error("Invalid Or Expired Entanglement Join Code.")

        }
        await entanglementCodes.delete(ETG_CODE);

        await LogGeneral(this.interaction, "RED", `Entanglement Notice`, `⚠️ **WARNING** ⚠️ This Server Is Now Entangled With ${ETG_ENTITY.name} (${ETG_ENTITY.IDENT}). ALL ACTIONS PERFORMED WILL BE PERFORMED AS ACTIONS FROM ${ETG_ENTITY.name}. \n\n 🛑 ECON Logging IS No Longer Available.`)
        await entanglementCache.set(this.IDENT, ETG_ENTITY.IDENT)
        const a = await SQL.models.Guilds.update({entanglement: String(ETG_ENTITY.IDENT)}, {where: {IDENT: this.IDENT}})
        return a;
    },
    disengage: async function(){
        try {
            await SQL.models.Guilds.update({entanglement: null,}, {where: {IDENT: this.IDENT,},},);
            await SQL.models.Guilds.update({entanglement: null,}, {where: {entanglement: this.IDENT,},},);
            await  LogGeneral(this.interaction, "ORANGE", `Entanglement Notice`,`**Notice** This Server Has Disengaged From All Entanglements. This Server Is Now Operating On It's Own Treasury and Economy. 🟢 ECON Logging Is Now Available For The Server.`)
        }catch(err){
            console.log(err)
            return err;
        }
    },
    getEntanglement:async function(){
        try{

            let guild = await SQL.models.Guilds.findByPk(this.IDENT, {raw: true});

            if(!guild){
                return false;
            }

            if(guild.entanglement){

                return guild.entanglement
            }else{
                return false;
            }
        }catch(err){
            console.log(err)
            return err
        }
    }
}

module.exports = Entanglement;
