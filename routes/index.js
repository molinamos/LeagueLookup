const summoner = require('./summoner')

module.exports = (app) => {
	app.use('/summoner', summoner)
}