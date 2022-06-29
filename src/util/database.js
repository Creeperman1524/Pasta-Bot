const fs = require('fs');

/**
 * Writes information to the database (a json file)
 * @param {JSON} data A JSON object of data to be written to the data (overwrites the entire thing)
 */
function writeToDatabase(data) {
	fs.writeFileSync('./src/storage.json', JSON.stringify(data));
}

/**
 * Reads from the database (a json file)
 * @returns Returns the entire datapase as a JSON object
 */
function readFromDatabase() {
	const raw = fs.readFileSync('./src/storage.json');
	return JSON.parse(raw);
}

module.exports = {
	writeToDatabase, readFromDatabase,
};