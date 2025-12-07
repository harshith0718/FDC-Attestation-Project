const { parse } = require('csv-parse');
const fs = require('fs');

async function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(parse({ 
                columns: true, // Use first line as column names
                skip_empty_lines: true
            }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(normalizeEntries(results)))
            .on('error', (error) => reject(error));
    });
}

function normalizeEntries(entries) {
    return entries.map(entry => {
        // Convert all values to strings and trim whitespace
        const normalized = {};
        for (const [key, value] of Object.entries(entry)) {
            normalized[key.trim()] = String(value).trim();
        }
        return normalized;
    });
}

function buildSummary(entries) {
    if (!entries || entries.length === 0) {
        return {};
    }

    const summary = {
        totalEntries: entries.length,
        columns: Object.keys(entries[0]),
        sampleEntry: entries[0],
        timestamp: new Date().toISOString()
    };

    return summary;
}

module.exports = {
    parseCSV,
    normalizeEntries,
    buildSummary
};
