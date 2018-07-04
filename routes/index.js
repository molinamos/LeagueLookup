const Router = require('express-promise-router')
	db = require('../db'),
	request = require('sync-request'),
	router = new Router(),
	summoner = require('./summoner')

module.exports = (app) => {
	app.use('/summoner', summoner),
	app.use('/', router)
}

router.get('/', async (req, res) => {
	res.render('index', ({
        summonerInfo: null,
        summonerAccount2: null
    }));
});