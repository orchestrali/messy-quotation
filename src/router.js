const bells = require('./bells.js');
let entrants = [];
let numbells = 6;

module.exports = function router(io) {
  //console.log("router function");
  io.on("connection", (socket) => {
    console.log("connection");
    //console.log(socket.id);
    //send current names to prevent duplicates
    socket.emit('names', entrants.map(e => e.name));
    socket.emit('bells', bells);
    socket.emit('numbells', numbells);
    socket.emit("entrance", {info: entrants});
    
    socket.on("entrant", (obj) => {
      console.log("entrant");
      if ([process.env.SECRET, process.env.CAPTAIN].includes(obj.secret)) {
        //add person to list, send list, send socket the current stage
        entrants.push({name: obj.name, id: socket.id, conductor: obj.secret === process.env.CAPTAIN, bells: []});
        socket.emit("open", {entrants: entrants});
        socket.broadcast.emit("entrance", {info: entrants});
      } else {
        socket.emit("wrong", "");
      }
      
    });
    
    socket.on("disconnect", () => {
      console.log("user disconnected");
      let i = entrants.findIndex(e => e.id === socket.id);
      if (i > -1) {
        console.log(entrants[i].name);
        entrants.splice(i, 1);
        io.emit("entrance", {type: "entrants", info: entrants});
      }
    });
    
    socket.on("assign", (obj) => {
      console.log("assign");
      let ringer = entrants.find(r => r.name === obj.name);
      if (ringer) {
        ringer.bells = obj.bells;
      } else {
        console.log(obj);
      }
      io.emit("assignment", entrants);
    });
    
    socket.on("ring", (obj) => {
      //console.log(obj);
      io.emit("ring", obj);
    });
    
    socket.on("chat", (obj) => {
      console.log("chat");
      io.emit("chat", obj);
    });
    
    socket.on("stage", (n) => {
      numbells = n;
      io.emit("stagechange", numbells);
    });
    
  });
  
}

