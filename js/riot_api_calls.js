const request = require('sync-request');
const apiKey = 'RGAPI-85e3640d-5b91-4f27-a5f4-e0c9cb5ef928';
const base_url = '.api.riotgames.com/lol/';
const version = 'v3';

const Router = require('express-promise-router')
const db = require('../db')

const router = new Router()

module.exports = router;

router.get('/:id', async (req, res)     => {
	const { id } = req.params
	const { rows } = await db.query('select * from summoners')
	res.render('index', {summonerInfo: data.name, accountId: data.accountid}); 
})

/*
const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'lookup_league',
  password: '12Zxcvbn!qw',
  port: 5432,
});
*/

/*
module.exports = {

	matchlistByAccount: function(accountId, region) {
		var url = `https://${region}${base_url}match/${version}/matchlists/by-account/${accountId}/recent?api_key=${apiKey}`;
		var res = request('GET', url);
		return res.body;
	},			

	summonerBySummonerName: function(name, region) {
		
		/*
		var res;

		db.any('SELECT * from summoners')
		.then(function (data) {
			//console.log('DATA:', data.value)
			data = JSON.parse(JSON.stringify(data[0]))
			console.log(data)


			console.log(data.name)

			res =  data.value
		})
		.catch(function (error) {
			console.log('ERROR:', error)
			res = error
		})
*/
		/*
		await client.connect();

		var res = await client.query('SELECT * from summoners');
		console.log(res)
		res = res.rows[0].message
		await client.end();
		
		console.log(res)
		*/


		/*
		var summonerName = name.replace(/ /g,"%20");
		var url = `https://${region}${base_url}summoner/${version}/summoners/by-name/${summonerName}?api_key=${apiKey}`;
		
		console.log("Calling Riot API")
		res = JSON.parse(request('GET', url).body);
		*/		
/*
		return res
	}

};
*/