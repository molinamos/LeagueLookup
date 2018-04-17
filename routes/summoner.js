const Router = require('express-promise-router')
const db = require('../db')

const router = new Router()

module.exports = router

router.get('/', async (req, res)     => {
	const name = req.query.name
	const { rows } = await db.query('select * from summoners where name = $1', [name])
	var data = JSON.stringify(rows)
	data = JSON.parse(data)

	console.log(name)
	console.log(data)
	console.log(Object.keys(data).length)

	res.render('index', {summonerInfo: data.name, accountId: data.accountid}); 
})