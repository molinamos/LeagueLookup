const http = require('http'),
      url = require('url'),
      fs = require('fs'),
      favicon = require('serve-favicon'),
      bodyParser = require('body-parser'),
	  mountRoutes = require('./routes')
      express = require('express'),
      app = express()

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use('/favicon.ico', express.static('public/favicon.ico'));
app.use(bodyParser.urlencoded({extended: true}));

var getIP = function(req, res, next){
	var ipAddress = req.connection.remoteAddress;
									
	if(ipAddress.substring(0, 7) == '::ffff:'){
		ipAddress = ipAddress.substring(7, ipAddress.length);
	}
	
	req.log = new Date(Date.now()).toString() + ' IP: ' + ipAddress+ ' METHOD: ' + req.method + ' URL: ' + req.originalUrl;
	console.log(req.log);
	
	fs.appendFile('stats/visitors.txt', req.log + "\n", function(err){
		if(err) throw err;
	})

	next();
}
app.use(getIP)

app.get('/', function(req, res){
	res.render('index', {
        status: "Search a summoner to look up the match history!",
        searchedName: req.query.name,
        error: null,
        summonerInfo: null, 
        summonerMatches: null
    });
});

app.listen(3000, function(){
	console.log('Lookout League listening on port 3000! To EXIT press ^C');
});

mountRoutes(app)




	