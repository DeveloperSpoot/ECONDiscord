const puppeteer = require("puppeteer");
const fs = require("fs");
// Load html templates and image assets into memory.
const atmHTML = fs.readFileSync("utils/templates/atm.html", "utf8");
const atmImg = fs.readFileSync("utils/assets/atmImage.png").toString("base64");

 function Snapml(){
    this.browser;
    this.page;
}

Snapml.prototype = {
    close: async function(){
        await this.page.close()
        await this.browser.close()
    },
    // Start the puppeteer browser and new page.
    open: async function(){
        this.browser = await puppeteer.launch({
            headless: "new", //Required to run so it doesn't try loading an actual browser
            args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
            ] // Required for linux servers.
        });

        this.page = await this.browser.newPage();
    },
    /**
     * generate the atm image with the dynamic values passed
     * @param {string} username 
     * @param {string} bankBalance 
     * @param {string} walletBalance 
     * @returns image buffer
     */
    getATM: async function(username, bankBalance, walletBalance){
        //Create a new html page from the template, and inject the values into the page.
        newATM = atmHTML
            .replace("{{atmImg}}", atmImg) //Inject the atm image into the page.
            .replace("{{username}}", username)
            .replace("{{bankBalance}}", bankBalance)
            .replace("{{walletBalance}}", walletBalance);
        
        await this.page.setContent(newATM); //Go to the html page

        let atmPage = await this.page.$(".atm") // get the specific element to screenshot.
        return await atmPage.screenshot({
            type: "png",
            omitBackground: true
        }) // return the image buffer of our ATM with values injected.

        /**
         * Note that puppeteer wont load images unless they are injected. CSS has to be in the same HTML page header or injected into the header.
         */
    },
}

module.exports = Snapml;