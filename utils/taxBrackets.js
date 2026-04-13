function parseBrackets(str) {
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
        return { error: 'Brackets string is empty. Example: `50000:10,100000:20,30`' };
    }
    const brackets = [];
    let prev = 0;
    for (const part of parts) {
        if (part.includes(':')) {
            const [threshStr, rateStr] = part.split(':');
            const thresh = Number(threshStr);
            const rate = Number(rateStr);
            if (isNaN(thresh) || isNaN(rate)) {
                return { error: `Invalid bracket \`${part}\`. Expected \`threshold:rate\` (e.g. \`50000:10\`).` };
            }
            if (thresh <= prev) {
                return { error: `Thresholds must be in ascending order. Got \`${thresh}\` after \`${prev}\`.` };
            }
            if (rate < 0 || rate > 100) {
                return { error: `Rate \`${rate}\` is out of range. Must be between 0 and 100.` };
            }
            brackets.push({ from: prev, to: thresh, rate });
            prev = thresh;
        } else {
            const rate = Number(part);
            if (isNaN(rate)) {
                return { error: `Invalid top rate \`${part}\`. Expected a plain number (e.g. \`30\`).` };
            }
            if (rate < 0 || rate > 100) {
                return { error: `Rate \`${rate}\` is out of range. Must be between 0 and 100.` };
            }
            brackets.push({ from: prev, to: Infinity, rate });
        }
    }
    return { brackets };
}

function calcTax(amount, brackets) {
    let tax = 0;
    for (const b of brackets) {
        if (amount <= b.from) break;
        const slice = Math.min(amount, b.to) - b.from;
        tax += slice * (b.rate / 100);
    }
    return Math.round(tax * 100) / 100;
}

module.exports = { parseBrackets, calcTax };
