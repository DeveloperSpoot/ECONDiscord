const { Sequelize } = require("sequelize");
const sqlite = require("sqlite3").verbose()
const connectionString = process.env.DATABASE_URL;
var SQL;

if (connectionString == "") {
    SQL = new Sequelize({
        dialect: 'sqlite',
        storage: './econdb.sqlite',
        logging: false
    })
}else{
 SQL = new Sequelize(connectionString, {logging: false, dialectOptions: {
        ssl: {
            require: true
        }
    }});    
}

module.exports = SQL;
