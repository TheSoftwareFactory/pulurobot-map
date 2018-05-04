const Sqlite = require('sqlite-pool');
class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.id = 0;
    }

    getUsername(){
        return this.username;
    }

    getPassword(){
        return this.password;
    }

    save(){
        const db = new Sqlite('../artifacts/maps.db', {Promise});
        let sql = 'INSERT INTO Users (username, password, id) VALUES ("'+this.username+'", "'+this.password+'", "'+this.id+'")';
        console.log(sql);
        db.run(sql, function(err){
        if (err){
            db.close();
            return console.error(err.message);
        }
        else{
            console.log('Row added successfully.')
        }
        db.close();
    });
    }

    getAll(){

    }

    findById(){

    }
}
module.exports = User;