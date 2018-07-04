const Router = require('express-promise-router'),
    db = require('../db'),
    request = require('sync-request'),
    router = new Router(),
    base_url = '.api.riotgames.com/lol/',
    config = require('../config'),
    version = 'v3',
    apiKey = config.apiKey,
    gameLimit = 5,
    limitCalls = true

module.exports = router

router.get('/', async (req, res) => {

    var summonerName = req.query.name.replace(/ /g, "").toLowerCase(),
        region = req.query.region,
        summonerAccount,
        summonerHistory,
        summonerMatches,
        matches

    if(req.query.update){

        try{
            var url = `https://${region}${base_url}summoner/${version}/summoners/by-name/${summonerName}?api_key=${apiKey}`
        }
        catch(error){
            console.log("cannot connect to RIOT API servers")
        }
        var summonerAccountResponse = JSON.parse(request('GET', url).body)

        try{
            await db.query(
                `insert into summoners (profileiconid, name, summonerlevel, accountid, id, revisiondate, sname) values($1, $2, $3, $4, $5, $6, $7)`, 
                [summonerAccountResponse.profileIconId, summonerAccountResponse.name, summonerAccountResponse.summonerLevel, summonerAccountResponse.accountId, summonerAccountResponse.id, summonerAccountResponse.revisionDate, summonerName]
            )
        }
        catch(error){
            //console.log("ERROR: summonerAccount already in database")
        }

        summonerAccount = JSON.parse(JSON.stringify(await db.query(
                                'select * from summoners where sname = $1', 
                                [summonerName]))).rows[0]
        
        if(summonerAccount.accountid == null)
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
                //console.log("ERROR: summonerhistory already in database")
            }
        }

        summonerHistory = JSON.parse(JSON.stringify(
                                await db.query(
                                    'select * from summonerhistory ' + 
                                    'where accountid = $1 ' + 
                                    'order by summonerhistory.timestamp ' + 
                                    'limit $2', 
                                    [summonerAccount.accountid, gameLimit]
                                )
                            )).rows

        //summonerHistory = JSON.parse(JSON.stringify(await db.query('select * from summonerhistory where accountid = $1 order by summonerhistory.timestamp', 
         //                                                           [summonerAccount.accountid]))).rows

        

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
                //console.log(error)
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
                    //console.log(error)
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
                    //console.log(error)
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
                    //console.log(error)
                }
            }

        }
    }

    if(summonerAccount == null){
        summonerAccount = JSON.parse(JSON.stringify(await db.query(
            'select * ' + 
            'from summoners ' + 
            'where sname = $1', 
            [summonerName]))).rows[0]

        if(typeof summonerAccount == "undefined"){
            res.render('index', {
                status: "Summoner data empty. Please search the summoner again but with the 'Update' button instead of the 'GO' button.",
                searchedName: req.query.name,
                error: null,
                summonerInfo: undefined, 
                summonerMatches: undefined,
            });
            return;
        }

        if(summonerAccount.accountid == null)
            summonerAccount = JSON.parse(JSON.stringify(await db.query(
                'select * ' + 
                'from summoners ' + 
                'where sname = $1', 
                [summonerName]))).rows[1]
    }

    summonerMatches = await getSummonerHistory(summonerAccount.accountid, 5)

    matchesTotalInfo = await getMatchesInfo(summonerAccount.accountid, 50)

    res.render('index', {
        status: null,
        searchedName: req.query.name,
        error: null,
        summonerInfo: summonerAccount, 
        summonerMatches: summonerMatches,
    });
    
    //res.setHeader('Content-Type', 'application/json');
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //res.json({summonerAccount: summonerAccount, summonerMatches: summonerMatches});
})

async function getSummonerHistory(accountid, limit){
    return JSON.parse(JSON.stringify(
                await db.query(
                    'select M.* ' + 
                    'from matches M ' + 
                        'join summonerhistory S on S.gameid = M.gameid ' + 
                    'where S.accountid = $1 ' + 
                        'and M.gameid = S.gameid ' + 
                    'order by M.gamecreation ' + 
                    'limit $2', 
                    [accountid, limit]
                )
            )).rows
}

async function getMatchesInfo(accountid, limit){
    return JSON.parse(JSON.stringify(
                await db.query(
                    'select * ' + 
                    'from matches M ' + 
                        'join matchparticipantidentities MPI on MPI.gameid = M.gameid ' + 
                        'join matchparticipants MP on MP.gameid = M.gameid ' + 
                        'join summonerhistory S on S.gameid = M.gameid ' + 
                    'where S.accountid = $1 ' + 
                        'and M.gameid = S.gameid ' + 
                        'and MP.participantid = MPI.participantid ' + 
                    'order by M.gamecreation ' + 
                    'limit $2', 
                    [accountid, limit]
                )
            )).rows
}