const { EmbedBuilder, ButtonStyle } = require("discord.js");
const Guild = require("./guild");
const retrieve = require("./retrieve");
const { ButtonBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { deleteApp } = require("firebase-admin/app");

function Casino(interaction, gManager){
    this.interaction = interaction;
    this.gManager = gManager;
}

Casino.prototype = {
    getDeckOfCards: async function(shuffleDeck, blackJack){
        const suits = ["♣️", "♦️", "♥️", "♠️"];
        let newDeck = []

        if(blackJack === true){
            suits.forEach(suit => {
                newDeck.push(...[
                    {rank: 2, suit},
                    {rank: 3, suit},
                    {rank: 4, suit},
                    {rank: 5, suit},
                    {rank: 6, suit},
                    {rank: 7, suit},
                    {rank: 8, suit},
                    {rank: 9, suit},
                    {rank: 10, suit},
                    {rank: "J", suit},
                    {rank: "Q", suit},
                    {rank: "K", suit},
                    {rank: "A", suit}
    
                ])
            })
        }else {
            suits.forEach(suit => {
                newDeck.push(...[
                    {rank: "2", suit},
                    {rank: "3", suit},
                    {rank: "4", suit},
                    {rank: "5", suit},
                    {rank: "6", suit},
                    {rank: "7", suit},
                    {rank: "8", suit},
                    {rank: "9", suit},
                    {rank: "10", suit},
                    {rank: "J", suit},
                    {rank: "Q", suit},
                    {rank: "K", suit},
                    {rank: "A", suit}
    
                ])
            })
        }

        if(shuffleDeck){
            return await shuffle(newDeck)
        }

        return newDeck;
    },
    playBlackJack: async function(bet, interact){
        const treasury = await retrieve.treasury(this.interaction.IDENT);
        const user = await retrieve.userBasicAccounts(this.interaction, this.interaction.member)
    

        if(bet > (0.02*treasury.balance)){
            throw new Error(`You're Bet Is Too High. The Current Maxmium Bet Is ${await this.gManager.formatMoney(0.02*treasury.balance)}. (2% of Treasury Balance)`)
        }

        if(treasury.balance < bet){
            throw new Error("The Treasury Does Not Have Enough Funds To Pay Out This Bet.");
        }

        if(user.wallet.balance < bet){
            throw new Error(`Insufficient Funds In Your Wallet.`);
        }

        let cardIndex = 0;
        const cardDeck = await this.getDeckOfCards(true, true);

        let playersHandOne = [];
        let playersHandTwo = [];

        let playersValueOne = 0;
        let playersValueTwo = 0;

        let playSecondHand = false;
        let busted = false;
        let playerWin = false;
        let playerBlackJack = false;


        let dealersHand = []
        let dealersValue = 0;

        let dealersTurn = false;
        let dealerWin = false;
        let dealersStand = false;
        let dealersBlackJack = false;
        let firstPlay = true;
        let push = false;

        const respFilter = i => i.user.id === interact.user.id;

        await start(interact)

        return [playerWin, bet, push]
        /**
         *
         *  FUNCTIONS FUNCTIONS FUNCTIONS 
         *  
         */

        function getEmbed(){
            const jackEmbed = new EmbedBuilder()
            .setColor("Fuchsia")
            .setTitle("ECON Casino | BlackJack");

            const hitBtt = new ButtonBuilder()
			.setCustomId('Casino-Hit')
			.setLabel("Hit")
			.setStyle(ButtonStyle.Success);

		    const doubleBtt = new ButtonBuilder()
			.setCustomId('Casino-Double')
			.setLabel('Double')
			.setStyle(ButtonStyle.Secondary);

            const standBtt = new ButtonBuilder()
			.setCustomId('Casino-Stand')
			.setLabel('Stand')
			.setStyle(ButtonStyle.Primary);

            if(playersHandOne.length >= 3){
                doubleBtt.setDisabled(true);
            }

            if(user.wallet.balance < bet*2){
                doubleBtt.setDisabled(true);
            }

            const row = new ActionRowBuilder()
            .addComponents(hitBtt, standBtt, doubleBtt)

            if(playersValueOne > 21){dealersTurn = true}

            if(dealersTurn === true){
                let dealers = "";
                let players = "";
                
                dealersHand.forEach(card => dealers= dealers+card.rank+card.suit +" ");
                playersHandOne.forEach(card => players= players+card.rank+card.suit +" ");

                jackEmbed.setFields(
                    {name: "Dealers Hand", value: dealers, inline: true},
                    {name: "Dealers Value", value: dealersValue.toString(), inline: true},
                    {name: "\u200b", value: "\u200b", inline: true},
                    {name: "Your Hand", value: players, inline: true},
                    {name: "Your Value", value: playersValueOne.toString(), inline: true},
                    {name: "\u200b", value: "\u200b", inline: true}
                )
            }else{
                let players = "";
                
                playersHandOne.forEach(card => players= players+card.rank+card.suit +" ");

                jackEmbed.setFields(
                    {name: "Dealers Hand", value: `${dealersHand[0].rank}${dealersHand[0].suit} ⬛`, inline: true},
                    {name: "Dealers Value", value: dealersHand[0].value.toString(), inline: true},
                    {name: "\u200b", value: "\u200b", inline: true},
                    {name: "Your Hand", value: players, inline: true},
                    {name: "Your Value", value: playersValueOne.toString(), inline: true},
                    {name: "\u200b", value: "\u200b", inline: true}
                )
            }

            if(push){
                jackEmbed.addFields({name: "RESULT", value: "PUSH"})
                jackEmbed.setColor("DarkOrange")
                return {embeds: [jackEmbed], components: []}
            }

            if(dealersBlackJack || dealerWin){
                jackEmbed.addFields({name: "RESULT", value: "Dealer Won"})
                jackEmbed.setColor("DarkRed")
                return {embeds: [jackEmbed], components: []}
            }

            if(playerWin){
                jackEmbed.addFields({name: "RESULT", value: "You Won"})
                jackEmbed.setColor("DarkGreen")
                return {embeds: [jackEmbed], components: []}
            }

            if(busted === true){
                dealersTurn = true;
                jackEmbed.addFields({name: "RESULT", value: "BUST"})
                jackEmbed.setColor("DarkRed")

                return {embeds: [jackEmbed], components: []}
            }

            if(dealersTurn){
                return {embeds: [jackEmbed], components: []}
            }


            return {embeds: [jackEmbed], components: [row]}
        }

        function getNewCard(){
            let newCard = cardDeck[cardIndex];

            if(newCard.rank === "J" || newCard.rank === "Q" || newCard.rank === "K"){
                newCard.value = 10;
            }else{
                newCard.value = newCard.rank;
            }

            cardIndex++;

            return newCard;
        }

        async function start(interaction){
            playersHandOne.push(getNewCard());
            cardIndex++;

            playersHandOne.push(getNewCard());
            cardIndex++;

            if((playersHandOne[0].rank === "A") && (playersHandOne[1].rank === "A")){
                playersValueOne = 11;
            }else if((playersHandOne[0].rank === "A") && (playersHandOne[1].rank !== "A")){
                let tempValue = 11 + playersHandOne[1].value;

                if(tempValue > 21){
                    playersValueOne = 1 + playersHandOne[1].value;
                }else{
                    playersValueOne = tempValue;
                }
            }else if((playersHandOne[0].rank !== "A") && (playersHandOne[1].rank === "A")){
                let tempValue = 11 + playersHandOne[0].value;

                if(tempValue > 21){
                    playersValueOne = 1 + playersHandOne[0].value;
                }else{
                    playersValueOne = tempValue;
                }
            }else{
                playersValueOne = playersHandOne[0].value + playersHandOne[1].value
            }

            dealersHand.push(getNewCard());
            cardIndex++;

            dealersHand.push(getNewCard());
            cardIndex++;

            if((dealersHand[0].rank === "A") && (dealersHand[1].rank === "A")){
                dealersValue = 11;
            }else if((dealersHand[0].rank === "A") && (dealersHand[1].rank !== "A")){
                let tempValue = 11 + dealersHand[1].value;

                if(tempValue > 21){
                    dealersValue = 1 + dealersHand[1].value;
                }else{
                    dealersValue = tempValue;
                }
            }else if((dealersHand[0].rank !== "A") && (dealersHand[1].rank === "A")){
                let tempValue = 11 + dealersHand[0].value;

                if(tempValue > 21){
                    dealersValue = 1 + dealersHand[0].value;
                }else{
                    dealersValue = tempValue;
                }
            }else{
                dealersValue = dealersHand[0].value + dealersHand[1].value
            }

            let response = await interaction.reply(getEmbed());
            let actionConfirmed = await response.awaitMessageComponent({filter: respFilter, time:7200_000})

            if(playersValueOne === 21){
                dealersTurn = true;
                playerBlackJack = true;
                bet = bet *2
                dealerPlay(actionConfirmed);
            }else{
                await keepPlayering(actionConfirmed)
            }
            

            return [playerWin, bet, push];
        }

        async function dealerPlay(playersResponse){
            if(busted === true){
                
                playersResponse.update(getEmbed())
                return 
            }

            // If only the player has blackjack, player won

            if(playerBlackJack && dealersValue !==21){
                playerWin = true;
                playersResponse.update(getEmbed())
                return;
            }

            // If only the dealer has blackjack, delaer won

            if(dealersValue === 21 && playersValueOne < 21){
                dealersBlackJack = true;

                playersResponse.update(getEmbed())
                return;
            }

            // if the player and dealer has the same amount, push.

            if(playersValueOne === dealersValue){
                push = true;
                playerWin = false;
                playersResponse.update(getEmbed())
                return;
            }

            if(dealersValue >=17 && playersValueOne > dealersValue){
                playerWin = true;
                playersResponse.update(getEmbed())
                return;
            }

            if(dealersValue >=17 && playersValueOne <= 17){
                dealerWin = true;
                playersResponse.update(getEmbed())
                return;
            }

            if(dealersValue > playersValueOne && dealersValue >= 17){
                dealerWin = true;
                playersResponse.update(getEmbed())
                return
            }

            let dealerHitReq = false;

            while(dealerHitReq === false){
                hit()
                if(dealersValue > 16){
                    dealerHitReq = true;
                    if(dealersValue <=21 && dealersValue > playersValueOne){
                        dealerWin = true;
                        playersResponse.update(getEmbed())
                        return;
                    }
        
                    if(dealersValue === playersValueOne){
                        push = true;
                        playersResponse.update(getEmbed())
                    }
        
                    if(dealersValue > 21){
                        playerWin = true;
                        playersResponse.update(getEmbed())
                        return
                    }

        
                    if(dealersValue > playersValueOne || playersValueOne < 17){
                        dealerWin = true
                        playersResponse.update(getEmbed())
                        return;
                    }else{
                        playerWin = true
                        playersResponse.update(getEmbed())
                        return;
                    }
                    break
                }
    
            }


            if(dealersValue <=21 && dealersValue > playersValueOne){
                dealerWin = true;
                playersResponse.update(getEmbed())
                return;
            }

            if(dealersValue === playersValueOne){
                push = true;
                playersResponse.update(getEmbed())
            }

            if(dealersValue > 21){
                playerWin = true;
                playersResponse.update(getEmbed())
                return
            }

            if(dealersValue > playersValueOne){
                dealerWin = true
                playersResponse.update(getEmbed())
                return;
            }else{
                playerWin = true
                playersResponse.update(getEmbed())
                return;
            }
            
        }

        async function keepPlayering(action){

            switch(action.customId){
                case "Casino-Hit": {
                    hit()
                    break; 
                }

                case "Casino-Double": {
                    double();
                    break;
                }

                case "Casino-Split": {
                    split();
                    break;
                }

                case "Casino-Stand": {
                    stand();
                    break;
                }
            }

            if(dealersTurn){return dealerPlay(action)}

            if(playersValueOne >= 22){busted = !busted; dealersTurn = true; dealerPlay(action); return;}

            if(playersValueOne === 21 && playersHandOne.length === 2){
                playerBlackJack = true;
                dealerPlay(action);

                return
            }

           if(dealersTurn){return dealerPlay(action)}

           let PLAYresponse =  await action.update(getEmbed());

           let newaction = await PLAYresponse.awaitMessageComponent({filter: respFilter, time:3600_000})
           if(dealersTurn){return dealerPlay(action)}

           keepPlayering(newaction)
        }

        function hit(){
            if(dealersTurn === true){
                let newCard = getNewCard()
                dealersHand.push(newCard);
                cardIndex++;
    
                if((newCard.rank === "A")&& (11 + dealersValue) > 21){
                    dealersValue = dealersValue + 1
                }else if((newCard.rank === "A") && (11 + dealersValue) <= 21){
                    dealersValue = dealersValue + 11
                }else{
                    dealersValue = dealersValue + newCard.value
                }
                return
            }

                let newCard = getNewCard()
                playersHandOne.push(newCard);
                cardIndex++;
    
                if((newCard.rank === "A")&& (11 + playersValueOne) > 21){
                    playersValueOne = playersValueOne + 1
                }else if((newCard.rank === "A") && (11 + playersValueOne) <= 21){
                    playersValueOne = playersValueOne + 11
                }else{
                    playersValueOne = playersValueOne + newCard.value
                }

        }

        function double(){
            hit()
            bet = bet*2;
            dealersTurn = true;
            if(playersValueOne > 21){
                busted = true
            }
        }
        function stand(){
            dealersTurn = true;
        }
    },
    playSlots: async function(bet){
        const treasury = await retrieve.treasury(this.interaction.IDENT);
        const user = await retrieve.userBasicAccounts(this.interaction, this.interaction.member)

        if(bet > (0.02*treasury.balance)){
            throw new Error(`You're Bet Is Too High. The Current Maxmium Bet Is ${await this.gManager.formatMoney(0.02*treasury.balance)}. (2% of Treasury Balance)`)
        }

        if(treasury.balance < bet*3){
            throw new Error("The Treasury Does Not Have Enough Funds To Pay Out This Bet.");
        }

        if(user.wallet.balance < bet){
            throw new Error(`Insufficient Funds In Your Wallet.`);
        }
    

        const symbols = [{symbol: "🍋", multiplier: .4}, {symbol: "🍒", multiplier: .7}, {symbol:"🍑", multiplier: .5},{symbol: "🍉", multiplier: .6},{symbol: "🍇", multiplier: .3}, {symbol:"💎", multiplier: 1}]

        let play = Array.apply(null, Array(3)).map(function () { });

        await play.forEach((value, index)=> play[index] = symbols[Math.floor(Math.random()*symbols.length)]);

        if(play[0].symbol === play[1].symbol && play[1].symbol !== play[2].symbol){
            const multiplier = play[0].multiplier + play[1].multiplier;
            
            return {result: "WIN", amount: (bet*multiplier), play}
        }

        
        if(play[0].symbol !== play[1].symbol && play[1].symbol === play[2].symbol){
            const multiplier = play[1].multiplier + play[2].multiplier;
         
            return {result: "WIN", amount: (bet*multiplier), play}
        }

        if(play[0].symbol === play[1].symbol && play[1].symbol === play[2].symbol){
            const multiplier = play[0].multiplier + play[1].multiplier + play[2].multiplier;
       
            return {result: "WIN", amount: (bet*multiplier), play}
        }

        return {result: "LOSS", amount: 0, play};
    }
}

function shuffle(array) {
    let currentIndex = array.length;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array
  }

module.exports = Casino;