const express = require("express")
const router = express.Router()
const models = require("../models/models")
const discord = require("discord.js")
let TokenGenerator = require('uuid-token-generator')

const client = new discord.Client

router.post('/validate-token',(req,res) => {
    const token = req.params.token
    if(!token){return res.send({response: "INVALID FORM BODY"})}
    models.Team.findOne({
        token:token
    }, (err,team) => {
        if (err){console.error(err)}
        if(!team) {
            res.send({response: "INVALID TOKEN", value:false})
        }else{
            res.send({response: team, value: true})
        }
    })
})

router.post('/newTask',(req,res) => {
    let creator = req.body.creator
    let worker = req.body.worker
    let name = req.body.name
    let desc = req.body.desc
    let due = req.body.due
    let token = req.body.token
    if(!creator||!worker||!name||!token){return res.send({response: "INVALID FORM BODY"})}
    if(!desc){desc = "None"}
    if(!due){due = "No Date Listed!"}
    models.Team.findOne({
        token:token
    }, (err,team) => {
        if (err){console.error(err)}
        if(!team) {
            res.send({response: "INVALID TOKEN", value:false})
        }else{
            let creatorUser = client.users.find(x => x.id == creator)
            if(!creatorUser){return res.send({response: "CREATOR VALUE MUST BE DISCORD ID"})}
            let workerUser = client.users.find(x => x.id == worker)
            if(!workerUser){return res.send({response: "WORKER VALUE MUST BE DISCORD ID"})}
            const tokgen = new TokenGenerator(128,TokenGenerator.BASE16) 
            const token = tokgen.generate()
            team.tasks.push({
                creator:creatorUser.username,
                worker: workerUser.username,
                name: name,
                desc: desc,
                due: due,
                id: token,
                work: []
            })
            let embed = new discord.RichEmbed()
            .setTitle(`New Task: ${name} from ${creatorUser.username}`)
            .setDescription(`${desc} \n \n Due: ${due}`)
            workerUser.send(embed).catch(err => console.log(err.message))
            res.status(500).send({id: token})
            team.save()
            models.User.findOne({
                id: worker
            },(err,user) => {
                if (err){console.error(err)}
                if(!user){
                    const tokgen = new TokenGenerator(256,TokenGenerator.BASE71) 
                    const token = tokgen.generate()
                    const newUser = new models.User({
                        token: token,
                        id: msg.author.id,
                        teams: [],
                        tasks: [{creator:creatorUser.username,worker: workerUser.username,name: name,desc: desc,due: due,id: token,team:team.id,work:[]}]
                    })
                    newUser.save()
                }else{
                    user.tasks.push({creator:creatorUser.username,worker: workerUser.username,name: name,desc: desc,due: due,id: token,team:team.id,work:[]})
                    user.save()
                }
            })
        }
    })
})

router.post("/addWork",(req,res) => {
    let id = req.body.id
    let work = req.body.work
    let user = req.body.user
    if(!user || !id || !work){return res.send("Invalid Parameters")}
    models.User.findOne({
        id:user
    }, (err,User) => {
        if (err){console.error(err)}
        if(!User) {
            res.send("No user found!")
        }else{
            let task = User.tasks.find(x => x.id == id)
            if(!task){
                res.send('No task found!')
            }else{
                let workFolder = task.work
                if(!workFolder){
                    task.push({work: work})
                }else{
                    for (let i = 0; i < work.length; i++) {
                        const Url = work[i];
                        workFolder.push(Url)
                    }        
                }
                res.send('Added Work!')  
            }
        }
        User.save()
    })
})

router.post('/turnIn',(req,res) => {
    let id = req.body.id
    let user = req.body.user
    if(!user || !id){return res.send("Invalid Parameters")}
    models.User.findOne({
        id:user
    }, (err,User) => {
        if (err){console.error(err)}
        if(!User) {
            res.send("No user found!")
        }else{
            let task = User.tasks.find(x => x.id == id)
            if(!task){
                res.send('No task found!')
            }else{
                models.Team.findOne({
                    token:task.token
                }, (err,Team) => {
                    if (err){console.error(err)}
                    if(!Team) {
                        res.send('No team found!')
                    }else{
                        let teamTask  = Team.tasks.find(x => x.id == id)
                        if(!teamTask){
                            res.send(`Task was deleted by team, somehow wasn't on your end.`)
                        }else{
                            teamTask.push({work: task.work||[]})
                            task = null // So they can't change it
                            Team.save()
                            User.save()
                        }
                    }
                })
            }
        }
        User.save()
    })
})

router.put("/updateTask",(req,res) => {
    let creator = req.body.creator
    let worker = req.body.worker
    let name = req.body.name
    let desc = req.body.desc
    let due = req.body.due
    let token = req.body.token
    let id = req.body.id
    let teamId = req.body.team
    if(!creator||!worker||!name||!token||!id||!teamId){return res.send({response: "INVALID FORM BODY"})}
    if(!desc){desc = "None"}
    if(!due){due = "No Date Listed!"}
    models.Team.findOne({
        id:teamId
    }, (err,team) => {
        if (err){console.error(err)}
        if(!team) {
            res.send({response: "NO TEAM FOUND!", value:false})
        }else{
            let creatorUser = client.users.find(x => x.id == creator)
            if(!creatorUser){return res.send({response: "CREATOR VALUE MUST BE DISCORD ID"})}
            let workerUser = client.users.find(x => x.id == worker)
            if(!workerUser){return res.send({response: "WORKER VALUE MUST BE DISCORD ID"})}
            if(team.token !== token){res.send({response: "INVALID TOKEN", value:false})}
            let task = team.tasks.find(x => x.id == id)
            if(!task){res.send({response: "NO POST FOUND!", value:false})}
            task.creator=creatorUser.username
            task.worker=workerUser.username
            task.name=name
            task.desc=desc
            task.due=due
            team.save()
            res.send({id:id})
        }
    })
})

router.get('/:id/token/:token', (req,res) => {
    const id = req.params.id
    const token = req.params.token
    models.Team.findOne({
        id:id
    }, (err,team) => {
        if (err){console.error(err)}
        if(!team) {
            res.send({response: "NO TEAM FOUND!", value:false})
        }else{
            if(team.type == 2){
                if(!token){return res.send({response: "PRIVATE TEAM|TOKEN NEEDED", value:false})}
                models.Team.findOne({
                    token:token
                }, (err,team) => {
                    if (err){console.error(err)}
                    if(!team) {
                        res.send({response: "INVALID TOKEN", value:false})
                    }else{
                        res.send({value:true,response:team})
                    }
                })
            }else{
                res.send({value:true,response:{
                    members:team.members,
                    name: team.name,
                    tasks: team.tasks
                }})
            }
        }
    })
})

router.get("/:team/posts/:post",(req,res) => {
    models.Team.findOne({
        id:req.params.team
    }, (err,team) => {
        if (err){console.error(err)}
        if(!team) {
            res.send({response: "NO TEAM FOUND"})
        }else{
            let post = team.tasks.find(x => x.id == req.params.post)
            if(!post){return res.send("No Post Found")}
            res.render("post.ejs",{task: post.name, desc: post.desc,due: post.due})
        }
    })
})

router.post("/invite/:token",(req,res) => {
    let token = req.params.token
    let user = req.body.user
    if(!token || !user){res.send("Invalid Request")}
    models.User.findOne({
        id:user
    }, (err,User) => {
        if (err){console.error(err)}
        if(!User) {
            res.send('No user was found\nor\nUser accepting invite is not invite receiver')
        }else{
            let request = User.requests.find(x => x.token == token)
            if(!request){
                res.send("Invite is invalid")
            }else{
                request = null
                user.teams.push({id:request.team})
                models.Team.findOne({
                    id:request.team
                }, (err,team) => {
                    if (err){console.error(err)}
                    if(!team) {
                        res.send('Invalid team\nor\nTeam was deleted')
                    }else{
                        let invite = team.requests.find(x => x.user == user) 
                        if(!invite){
                            res.send('Invite was expired\nor\nInvite was deleted')
                        }else{
                            invite = null
                            team.members.push(user)
                            res.send('Invite has been accepted')
                        }

                    }
                    team.save()
                })
            }
            User.save()
        }
    })
})

module.exports = router
client.login(process.env.token)