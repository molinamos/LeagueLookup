const Router = require('express-promise-router'),
      db = require('../db'),
      request = require('sync-request')

const router = new Router()
const base_url = '.api.riotgames.com/lol/'
const version = 'v3'
const apiKey = 'RGAPI-0227ff17-0f4c-4e35-82e6-fe0723746f35'
const gameLimit = 5
const limitCalls = true
module.exports = router

router.get('/', async (req, res) => {

    var summonerName = req.query.name.replace(/ /g, "").toLowerCase()
    const region = req.query.region
    var summonerAccount
    var summonerHistory
    var summonerMatches

    if(req.query.update){
    
        var url = `https://${region}${base_url}summoner/${version}/summoners/by-name/${summonerName}?api_key=${apiKey}`
        var summonerAccountResponse = JSON.parse(request('GET', url).body)

        try{
            await db.query(`insert into summoners (profileiconid, name, summonerlevel, accountid, id, revisiondate, sname) values($1, $2, $3, $4, $5, $6, $7)`, [summonerAccountResponse.profileIconId, summonerAccountResponse.name, summonerAccountResponse.summonerLevel, summonerAccountResponse.accountId, summonerAccountResponse.id, summonerAccountResponse.revisionDate, summonerName])
        }
        catch(error){
            //console.log("ERROR: summonerAccount already in database")
        }

        summonerAccount = JSON.parse(JSON.stringify(await db.query('select * from summoners where sname = $1', [summonerName]))).rows[0]
        
        if(summonerAccount.accountid == null)
            summonerAccount = JSON.parse(JSON.stringify(await db.query('select * from summoners where sname = $1', [summonerName]))).rows[1]
        

        url = `https://${region}.api.riotgames.com/lol/match/${version}/matchlists/by-account/${summonerAccount.accountid}?api_key=${apiKey}`
        var summonerHistoryResponse = JSON.parse(request('GET', url).body)

        for(var match of summonerHistoryResponse.matches){
            try{
                await db.query(`insert into summonerhistory(accountid, lane, gameid, champion, platformid, timestamp, queue, role, season) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [summonerAccount.accountid, match.lane, match.gameId, match.champion, match.platformId, match.timestamp, match.queue, match.role, match.season])
            }
            catch(error){
                //console.log("ERROR: summonerhistory already in database")
            }
        }

        if(limitCalls){
            summonerHistory = JSON.parse(JSON.stringify(await db.query('select * from summonerhistory where accountid = $1 order by summonerhistory.timestamp limit $2', [summonerAccount.accountid, gameLimit]))).rows
        }else{
            summonerHistory = JSON.parse(JSON.stringify(await db.query('select * from summonerhistory where accountid = $1 order by summonerhistory.timestamp', [summonerAccount.accountid]))).rows
        }
        

        var count = 0
        for(var match of summonerHistory){

            count++

            if(limitCalls && count > 5)
                break

            url = `https://${region}.api.riotgames.com/lol/match/${version}/matches/${match.gameid}?api_key=${apiKey}`
            var matchResponse = JSON.parse(request('GET', url).body)

            try{
                await db.query('insert into matches(seasonid, queueid, gameid, gameversion, platformid, gamemode, mapid, gametype, gameduration, gamecreation) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [matchResponse.seasonId, matchResponse.queueId, matchResponse.gameId, matchResponse.gameVersion, matchResponse.platformId, matchResponse.gameMode, matchResponse.mapId, matchResponse.gameType, matchResponse.gameDuration, matchResponse.gameCreation])
            }
            catch(error){
                //console.log("ERROR: match is already in database")
            }

            //implement participlantidentities
            /*
            try-catch(error)
            */

            //implement teams
            /*
            try-catch(error)
            */

            //implement participants
            /*
            try-catch(error)
            */
        }

        if(limitCalls){
            summonerMatches = JSON.parse(JSON.stringify(await db.query('select M.* from matches M, summonerhistory S where S.accountid = $1 and M.gameid = S.gameid order by M.gamecreation limit $2', [summonerAccount.accountid, gameLimit]))).rows
        }else{
            summonerMatches = JSON.parse(JSON.stringify(await db.query('select M.* from matches M, summonerhistory S where S.accountid = $1 and M.gameid = S.gameid order by M.gamecreation limit all', [summonerAccount.accountid]))).rows
        }
        
        //console.log(summonerMatches)
    }

    if(summonerAccount == null){
        summonerAccount = JSON.parse(JSON.stringify(await db.query('select * from summoners where sname = $1', [summonerName]))).rows[0]

        if(summonerAccount.accountid == null)
            summonerAccount = JSON.parse(JSON.stringify(await db.query('select * from summoners where sname = $1', [summonerName]))).rows[1]
    }

    if(summonerHistory == null){
        summonerHistory = JSON.parse(JSON.stringify(await db.query('select * from summonerhistory where accountid = $1 order by summonerhistory.timestamp', [summonerAccount.accountid]))).rows
    }

    if(summonerMatches == null){
        summonerMatches = JSON.parse(JSON.stringify(await db.query('select M.* from matches M, summonerhistory S where S.accountid = $1 and M.gameid = S.gameid order by M.gamecreation limit 5', [summonerAccount.accountid]))).rows
    }


    res.render('index', {summonerInfo: summonerAccount.name, accountId: summonerAccount.accountid}); 
})
