const { Pool } = require('pg')

const pool = new Pool({
	host: 'localhost',
	database: 'lookup_league',
	user: 'postgres',
	password: '1234',
	port: '5432'
})

module.exports = {
  query: (text, params) => pool.query(text, params)
}