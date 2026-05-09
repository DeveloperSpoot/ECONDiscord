/***************************************************************************************************************
 * Generates Ledger logs in HTML based on the given params.
 * @param {String} AccountNumber The Account IDENT of which the report is of.
 * @param {Object} DATA The data generated from the ledger cmd.
 * @returns {Object}
 **************************************************************************************************************/
const {TransactionHQ} = require("../dataCrusher/Headquarters");
exports.LedgerGenerator = async function (interaction, AccountNumber, DATA) {

    function sortbyDate(a, b){
        let DateA = new Date(a.createdAt);
        let DateB = new Date (b.createdAt);

        if(DateA < DateB) return 1;
        if(DateA > DateB) return -1;
        return 0;
    }

    DATA = await DATA.sort(sortbyDate);


    var csv = 'Date,Credit,Debit,Amount,Memo\n';

    for (const i of DATA) {
        let date = new Date(i.createdAt);
        date = date.toLocaleDateString("en-US");
        let Info;
        if (i.creditType && i.debitType) {
            Info = await TransactionHQ.getAccount(interaction, i, true);
        } else {
            Info = await TransactionHQ.getBasicName(interaction, i, true)
            
        }

        const NFormat = new Intl.NumberFormat('en-us', {
            currency: 'USD',
            style: 'currency'
        })

        const row = [date, Info?.creditName??"UnknownEntity", Info?.debitName??"UnknownEntity", i.amount, i.memo.replace(/,/g, '')]

        csv += row.join(',');


        csv += "\n"
    }
return csv

}