const User = require('../models/User')
const userList = require("../../imports/users.json")
const bcrypt = require("bcrypt")
function printUser(){
    userList.forEach( (user) => {
        console.log(user.userID)
        let hashedPassword = ""
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.userPassword, salt, (err, hash) => {
                let currUser = new User({
                    userID: user.userID,
                    userName: user.userName,
                    userPassword: hash,
                    userDesc: user.userDesc,
                    userImage: user.userImage,
                    isEstablishmentOwner: user.isEstablishmentOwner,
                    establishmentID: user.establishmentID
                })
                currUser.save()
            })
            
        })
        
    })
    
}

module.exports = printUser()