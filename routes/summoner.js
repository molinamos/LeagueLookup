const Router = require('express-promise-router'),
    db = require('../db'),
    request = require('sync-request'),
    router = new Router(),
    base_url = '.api.riotgames.com/lol/',
    config = require('../config'),
    championFull = require('./championFull'),
    map = require('./map'),
    version = 'v3',
    apiKey = config.apiKey,
    gameLimit = 10,
    limitCalls = true

var name

module.exports = router

router.get('/', async (req, res) => {

    var summonerName = req.query.name.replace(/ /g, "").toLowerCase(),
        region = req.query.region,
        summonerAccount,
        summonerHistory,
        summonerMatches,
        matches

    if(req.query.update){
        
        var url = `https://${region}${base_url}summoner/${version}/summoners/by-name/${summonerName}?api_key=${apiKey}`

        var summonerAccountResponse = JSON.parse(request('GET', url).body)

        if(typeof summonerAccountResponse.name == "undefined"){
            res.render('index', {
                status: "Not a real summoner. Make sure you spelt it right.",
                searchedName: req.query.name,
                error: null,
                summonerInfo: null, 
                summonerMatches: null,
            });
            return;
        }

        try{
            await db.query(
                `insert into summoners (profileiconid, name, summonerlevel, accountid, id, revisiondate, sname) values($1, $2, $3, $4, $5, $6, $7)`, 
                [summonerAccountResponse.profileIconId, summonerAccountResponse.name, summonerAccountResponse.summonerLevel, summonerAccountResponse.accountId, summonerAccountResponse.id, summonerAccountResponse.revisionDate, summonerName]
            )
        }
        catch(error){
            if(error.code == "ECONNREFUSED"){
                res.render('index', {
                    status: "Local servers are down. Site is unavailable.",
                    searchedName: req.query.name,
                    error: null,
                    summonerInfo: null, 
                    summonerMatches: null,
                });
                return;
            }
            
        }

        summonerAccount = JSON.parse(JSON.stringify(await db.query(
                                'select * from summoners where sname = $1', 
                                [summonerName]))).rows[0]
        
        if(typeof summonerAccount == "undefined")
            summonerAccount = JSON.parse(JSON.stringify(await db.query(
                                                            'select * from summoners ' + 
                                                            'where sname = $1', 
                                                            [summonerName]))).rows[1]

        url = `https://${region}.api.riotgames.com/lol/match/${version}/matchlists/by-account/${summonerAccount.accountid}?api_key=${apiKey}`

        var summonerHistoryResponse = JSON.parse(request('GET', url).body)

        for(var match of summonerHistoryResponse.matches){
            try{
                await db.query(
                    `insert into summonerhistory(accountid, lane, gameid, champion, platformid, timestamp, queue, role, season) ` + 
                    `values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, 
                    [summonerAccount.accountid, match.lane, match.gameId, match.champion, match.platformId, match.timestamp, match.queue, match.role, match.season]
                )
            }
            catch(error){
                if(error.code == "ECONNREFUSED"){
                    res.render('index', {
                        status: "Local servers are down. Site is unavailable.",
                        searchedName: req.query.name,
                        error: null,
                        summonerInfo: null, 
                        summonerMatches: null,
                    });

                    return;
                }
            }
        }


        summonerHistory = JSON.parse(JSON.stringify(
                            await db.query(
                                'select * from summonerhistory ' + 
                                'where accountid = $1 ' + 
                                'order by summonerhistory.timestamp desc ' + 
                                'limit $2', 
                                [summonerAccount.accountid, gameLimit]
                            )
                        )).rows

        

        for(var match of summonerHistory){

            url = `https://${region}.api.riotgames.com/lol/match/${version}/matches/${match.gameid}?api_key=${apiKey}`
            
            var matchResponse = JSON.parse(request('GET', url).body)

            try{
                await db.query(
                    'insert into matches(seasonid, queueid, gameid, gameversion, platformid, gamemode, mapid, gametype, gameduration, gamecreation) ' + 
                    'values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', 
                    [matchResponse.seasonId, matchResponse.queueId, matchResponse.gameId, matchResponse.gameVersion, matchResponse.platformId, matchResponse.gameMode, matchResponse.mapId, matchResponse.gameType, matchResponse.gameDuration, matchResponse.gameCreation]
                )
            }
            catch(error){
                if(error.code != "23505"){
                    renderError4()
                    return;
                }
            }

            for(var participant of matchResponse.participants){

                try{
                    await db.query(
                        'insert into matchparticipants(gameid, spell1id, participantid, highestachievedseasontier, spell2id, teamid, championid) ' + 
                        'values($1, $2, $3, $4, $5, $6, $7)', 
                        [matchResponse.gameId, participant.spell1Id, participant.participantId, participant.highestAchievedSeasonTier, participant.spell2id, participant.teamId, participant.championId]
                    )
                }
                catch(error){
                    if(error.code != "23505"){
                        renderError4()
                        return;
                    }
                }
            }

            for(var participlantidentity of matchResponse.participantIdentities){
                try{
                    await db.query(
                        'insert into matchparticipantidentities(gameid, currentplatformid, summonername, matchhistoryuri, platformid, currentaccountid, profileicon, summonerid, accountid, participantid) ' + 
                        'values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', 
                        [matchResponse.gameId, participlantidentity.player.currentPlatformId, participlantidentity.player.summonerName, participlantidentity.player.matchHistoryUri, participlantidentity.player.platformId, participlantidentity.player.currentAccountId, participlantidentity.player.profileIcon, participlantidentity.player.summonerId, participlantidentity.player.accountId, participlantidentity.participantId]
                    )
                }
                catch(error){
                    if(error.code != "23505"){
                        renderError4()
                        return;
                    }
                }
            }

            for(var team of matchResponse.teams){
                
                try{
                    await db.query(
                        'insert into matchteams(gameid, teamid, win, firstblood, firsttower, firstinhibitor, firstbaron, firstdragon, firstriftherald, towerkills, inhibitorkills, baronkills, dragonkills, vilemawkills, riftheraldkills, dominionvictoryscore) ' + 
                        'values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)', 
                        [matchResponse.gameId, team.teamId, team.win, team.firstBlood, team.firstTower, team.firstInhibitor, team.firstBaron, team.firstDragon, team.firstRiftHerald, team.towerKills, team.inhibitorKills, team.baronKills, team.dragonKills, team.vilemawKills, team.riftHeraldKills, team.dominionVictoryScore]
                    )
                }
                catch(error){
                    if(error.code != "23505"){
                        res.render('index', {
                            status: "Problem with updating data.",
                            searchedName: req.query.name,
                            error: null,
                            summonerInfo: null, 
                            summonerMatches: null,
                        });
                        return;
                    }
                }
            }

        }
    }

    if(typeof summonerAccount == "undefined"){

        summonerAccount = JSON.parse(JSON.stringify(await db.query(
            'select * ' + 
            'from summoners ' + 
            'where sname = $1', 
            [summonerName]))).rows[0]

        if(typeof summonerAccount == "undefined"){
            summonerAccount = JSON.parse(JSON.stringify(await db.query(
                'select * ' + 
                'from summoners ' + 
                'where sname = $1', 
                [summonerName]))).rows[1]
        }
    }

    if(typeof summonerAccount == "undefined"){
        res.render('index', renderErrorEmpty(req.query.name));
        return;
    }
    matchesTotalInfo = await getMatchesInfo(summonerAccount.accountid, 50)

    for(var element of matchesTotalInfo){
        element.champion = championFull.keys[element.championid]
        element.mapid = map.data[element.mapid].MapName
    }

    res.render('index', {
        status: null,
        searchedName: req.query.name,
        error: null,
        summonerInfo: summonerAccount, 
        summonerMatches: matchesTotalInfo,
    });
    
    //res.setHeader('Content-Type', 'application/json');
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //res.json({summonerAccount: summonerAccount, summonerMatches: summonerMatches});
})

async function getMatchesInfo(accountid, limit){
    return JSON.parse(JSON.stringify(
                await db.query(
                    'select * ' + 
                    'from matches M ' + 
                        'join matchparticipantidentities MPI on MPI.gameid = M.gameid ' + 
                        'join matchparticipants MP on MP.gameid = M.gameid ' + 
                        'join summonerhistory SH on SH.gameid = M.gameid ' + 
                        'join matchteams MT on MT.gameid = M.gameid ' + 
                    'where SH.accountid = $1 ' +  
                        'and MP.participantid = MPI.participantid ' + 
                        'and MP.teamid = MT.teamid ' +
                    'order by SH.timestamp desc, MP.participantid ' + 
                    'limit $2', 
                    [accountid, limit]
                )
            )).rows
}

function renderErrorEmpty(name){
    return  {
        status: "Summoner data empty. Please search the summoner again but with the 'Update' button instead of the 'GO' button.",
        searchedName: name,
        error: null,
        summonerInfo: null, 
        summonerMatches: null,
    }
}
