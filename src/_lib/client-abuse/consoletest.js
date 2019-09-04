RoomPosition.prototype.link = function() {
    return `<a href="#!/room/${Game.shard.name}/${this.roomName}">[${ this.roomName } ${ this.x },${ this.y }]</a>`;
    };

  module.exports.loop = function () {

      if(Game.time % 5 === 0){
          console.log('<font color="#ff0000" type="highlight">red</font>');
          console.log('<font color="#00ff00" type="highlight">green</font>');
          console.log('<font color="#0000ff" type="highlight">blue</font>');

          // TODO: styles
          const level = 1
          const style = 'color: yellow; background-color: red'
          console.log(`<log severity="${level}" style="${style}">[${level}] log level yellow and bg color</log>`)

          console.log(`<omg style="color: white; background-color: black">[${level}] omg white black bg</omg>`)
          console.log(`<omg style="color: #ffffff; background-color: #000000">[${level}] omg white black bg</omg>`)

          console.log(`<omg style="color: #fff; background-color: #000000">[${level}]white?</omg>`)
          console.log(`<omg style='color: #fff; background-color: #000000'>[${level}]Dignissi white?</omg>`)

          console.log(Game.spawns.Spawn1.pos.link())

          var roomName = Game.spawns.Spawn1.room.name;
          console.log(`<a href="#!/room/${Game.shard.name}/${roomName}">[${ roomName }]</a>`)

          var roomName = Game.spawns.Spawn1.room.name;
          console.log(`<a style="color: white; background-color: black" href="#!/room/${Game.shard.name}/${roomName}">[${ roomName }]</a>`)

      }
  }