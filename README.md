> [!IMPORTANT]
> This current verison of ECON is stable, with some minor bugs. However, the code and overall design has transformed into spaghetti; So ECON is going be redone at some point in the future, with more features, with better code and better overall design. In the meantime please enjoy the current verison of ECON, make it yours or enjoy the hosted verison.

# ECONDiscord
An Economy Bot Developed By Roleplayers for Roleplayers. Developed by [@DeveloperSpoot](https://github.com/DeveloperSpoot), Visioned and Originally Designed By [@jcrump97](https://github.com/jcrump97).

## Getting Started
1. Create a ``.env`` File. In the .env file, include the following vairables:
   ```
   token=
   clientid=
   DATABASE_URL=#Leave Empty To Use Built-In Database.
   server_bypass=#insert server IDs here to bypass permium locks.
   ```

2. Create your Discord Application and Bot through the [Discord Developers Portal](https://discord.com/developers/applications). Update the ``.env`` file with the Bot Token and Application Client ID. For more help with setting up A Discord Bot Application please refer to the [Discord Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).

3. >As of verison 03.16.26, ECON now has a built-in database that you can use. You can leave the database URL blank in the enviromental file to use it, or if you like you can use you own database.

   Create a SQL database and obtain the database connection URL. ECON is designed with [sequelize](https://sequelize.org/docs/v6/getting-started/) and uses  SQL databases to store data. It's up to you to find a SQL database that meets your needs. Once you've created the SQL database, obtain the connection URL and update the ``.env`` file with it.

4. Setup Your SQL DB with all the tables and columns. Under ``DataCrusher/Models/`` there are files, where each file repersents a table, inside eacht able, you'll find the details of each column within that table. You can manually add these tables to your SQL DB or you can attempt to use the sequelize sync method; In ``Index.js`` you'll find a patch of lines commented out, within this commented section, the first line is a method ``await SQL.Sync({force: true})``, uncomment this method and run the bot once, then comment it again. If you add more things to the bot that gets stored in the DB, you can sync a specific model. **Note When Updating Models:** Some models can't be updated or "altered" through the sequelize package due to bugs within the package, I found it much easier to manually update the SQL DB with the changes using a SQL DB GUI editor.

5. Test run the bot. You should get a couple console logs letting you know the bot is online and is connected to the database.
   >NOTE: You will need to re-add the bot to the server (while it's running) before being able to use it. ECON adds a guild to the database when it's first added to a server.

## Fun Fact About Our Database module(s).
ECON went through three database modules, with different databases. The first datamodule wasn't actually modularized and used Firebase SDK and was called "Data Monster", Data Monster was messy and had many issues; so many issues I reworte it and this time I modularized the database, this data module was known as the "Data Destoryer". After a few more updates to the bot, me and JC realized that Firebase was not the answer to our database probelms and knowing that one day ECON may grow, we wanted to find a better solution that was expandable. So with that, I took it upon myself and reworte the data module for a third time, the third time wasn't as bad as the first couple of times, the modulalization made it much more simple to change databases and after a day, we were ready to go with an SQL database. This third and final data module that is still used today is known as the "Data Crusher".

# License
This project is released under the MIT License.
