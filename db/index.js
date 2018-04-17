const { Pool } = require('pg')

const pool = new Pool({
	host: 'localhost',
	database: 'lookup_league',
	user: 'postgres',
	password: '12Zxcvbn!qw',
	port: '5432'
})

module.exports = {
  query: (text, params) => pool.query(text, params)
}