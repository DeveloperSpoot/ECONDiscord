# ECONDiscord
An Economy Bot Developed By Roleplayers for Roleplayers. Developed by [@DeveloperSpoot](https://github.com/DeveloperSpoot), Visioned and Orignally Designed By [@jcrump97](https://github.com/jcrump97).

## Getting Started
1. Create a ``.env`` File. In the .env file, include the following vairables:
   ```
   token=
   clientid=
   DATABASE_URL=
   ```

2. Create your Discord Application and Bot through the [Discord Developers Portal](https://discord.com/developers/applications). Update the ``.env`` file with the Bot Token and Application Client ID. For more help with setting up A Discord Bot Application please refer to the [Discord Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).

3. Create a SQL database and obtain the database connection URL. ECON is designed with [sequelize](https://sequelize.org/docs/v6/getting-started/) and uses  SQL databases to store data. It's up to you to find a SQL database that meets your needs. Once you've created the SQL database, obtain the connection URL and update the ``.env`` file with it.

4. Test run the bot. You should get a couple console logs letting you know the bot is online and is connected to the database.

## Fun Fact About Our Database module(s).
ECON went through three database modules, with different databases. The first datamodule wasn't actually modularized and used Firebase SDK and was called "Data Monster", Data Monster was messy and had many issues; so many issues I reworte it and this time I modularized the database, this data module was known as the "Data Destoryer". After a few more updates to the bot, me and JC realized that Firebase was not the answer to our database probelms and knowing that one day ECON may grow, we wanted to find a better solution that was expandable. So with that, I took it upon myself and reworte the data module for a third time, the third time wasn't as bad as the first couple of times, the modulalization made it much more simple to change databases and after a day, were ready to go with an SQL database. This third and final data module that is still used today is known as the "Data Crusher".

# License
This project is released under the MIT License.
