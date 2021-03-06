const models = require("../models/models")
const discord = require("discord.js")
const TokenGenerator = require('uuid-token-generator')
module.exports = {
    name: "tasks",
    alias: "todue",
    description: "Get the tasks in a certain team",
    type: "any",
    runCommand(args,msg,client,rest = {}){
        models.User.findOne({
            id:msg.author.id
        }, (err,user) => {
            if (err){console.error(err)}
            if(!user) {
                const tokgen = new TokenGenerator(256,TokenGenerator.BASE71) 
                const token = tokgen.generate()
                const newUser = new models.User({
                    token: token,
                    id: msg.author.id,
                    teams: [],
                    tasks:[],
                    requests: []
                })
                let embed = new discord.RichEmbed()
                .setTitle('Tasks')
                .setDescription(`No Tasks Were Found!`)
                msg.channel.send(embed)
                return newUser.save()
            }else{
                let tasks = user.tasks
                if(tasks.length == 0){
                    let embed = new discord.RichEmbed()
                    .setTitle('Tasks')
                    .setDescription(`No Tasks Were Found!`)
                    return msg.channel.send(embed)
                }
                let desc = []
                for(v=0;v<tasks.length;v++){
                    let task = tasks[v]
                    desc.push(`Name: ${task.name} Id: ${task.id}`)
                }
                if(tasks.length == 0){
                    let embed = new discord.RichEmbed()
                    .setTitle('Tasks')
                    .setDescription('None')
                    msg.channel.send(embed)
                }else{
                    let embed = new discord.RichEmbed()
                    .setTitle('Tasks')
                    .setDescription(desc)
                    .setFooter('To view a task use wb!view [task_id]')
                    msg.channel.send(embed)
                } 
            }
        }) 
    }
}
