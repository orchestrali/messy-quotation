const bells = require('./bells2.js');
const parsepn = require('./pn/router.js');
const complib = require('./complib/router.js');
const rowArray = require('./rowArray.js');
let entrants = [];
let numbells = 6;
var state = {
  numbells: 6,
  duration: 1.3,
  speed: 2.3,
  chat: "",
  bells: []
};
var limbo = [];
var timeout;

module.exports = function router(io) {
  setstate("tower");
  //console.log("router function");
  io.on("connection", (socket) => {
    console.log("connection");
    //console.log(socket.id);
    //send current names to prevent duplicates
    socket.emit('names', entrants.map(e => e.name));
    socket.emit('bells', bells);
    
    
    socket.on('latency', (obj) => {
      console.log(obj);
      //socket.disconnect(true);
    });
    
    socket.on("error", e => {
      console.log(e);
    });
    
    //socket.prependAny((eventName, ...args) => {
    //  let exclude = ["connection", "entrant", "changestroke"];
    //  if (!exclude.includes(eventName)) console.log(eventName);
    //  
    //});
    
    //socket.use((packet, next) => {
    //  console.log(packet[0]);
    //  next();
    //});
    
    socket.on('test', (n) => {
      //console.log(Date.now()-n);
      //socket.emit('time', Date.now());
    });
    //
    socket.on("entrant", (obj) => {
      console.log("entrant");
      if ([process.env.SECRET, process.env.CAPTAIN].includes(obj.secret)) {
        //add person to list, send list, send socket the current stage
        if (entrants.map(e => e.name).includes(obj.name)) {
          socket.emit("duplicate", "");
        } else {
          let o = {name: obj.name, id: socket.id, conductor: obj.secret === process.env.CAPTAIN, bells: [], phones: []};
          entrants.push(o);
          socket.emit("open", {entrants: entrants, state: state});
          socket.broadcast.emit("entrance", {info: o});
        }
        
      } else if (obj.secret === process.env.PHONE && entrants.find(o => o.name === obj.name)) {
        console.log("phone connected");
        let ringer = entrants.find(o => o.name === obj.name);
        ringer.phones.push(socket.id);
        io.to(ringer.id).emit("phone", {id: socket.id});
        socket.emit("phoneopen", entrants);
        
      } else {
        socket.emit("wrong", "");
      }
      
    });
    
    socket.on("disconnect", (r) => {
      console.log("user disconnected");
      if (["ping timeout", "transport close", "transport error"].includes(r)) {
        limbo.push(socket.id);
        setTimeout(function() {
          for (let i = limbo.length-1; i > -1; i--) {
            disconnect(limbo[i]);
          }
        }, 3000)
      } else {
        disconnect(socket.id);
      }
      
      
    });
    
    socket.on("reenter", o => {
      let e = entrants.find(p => p.name === o.name);
      if (e && limbo.includes(e.id)) {
        let i = limbo.indexOf(e.id);
        limbo.splice(i,1);
        e.id = socket.id;
        clearTimeout(timeout);
        socket.emit("reopen", state);
      }
    });
    
    socket.on("assign", (obj) => {
      //console.log("assign");
      //console.log(obj);
      let ringer = entrants.find(r => r.name === obj.name);
      for (let i = 0; i < numbells; i++) {
        let j = state.bells[i].ringers.indexOf(obj.name);
        if (j > -1 && !obj.bells.includes(state.bells[i].num)) {
          state.bells[i].ringers.splice(j, 1);
        } else if (j === -1 && obj.bells.includes(state.bells[i].num)) {
          state.bells[i].ringers.push(obj.name);
        }
      }
      if (ringer) {
        ringer.bells = obj.bells;
      } else {
        console.log(obj);
      }
      io.emit("assignment", obj);
    });
    
    socket.on("assignphone", obj => {
      console.log("phone assigned");
      console.log(obj);
      io.to(obj.phoneid).emit("phoneassign", obj);
    });
    
    socket.on("ring", (obj) => {
      //console.log(obj);
      let bell = state.bells.find(b => b.num === obj.bell);
      if (obj.stroke === bell.stroke || bell.takenover) {
        io.emit("ring", obj);
        if (!bell.takenover) bell.stroke *= -1;
        bell.takenover = false;
      }
      
    });
    
    socket.on("changestroke", (obj) => {
      //console.log(obj);
      let bell = state.bells.find(b => b.num === obj.bell);
      let robot = entrants.find(o => o.name === "Sidra🤖");
      
      if (obj.stroke === bell.stroke) {
        if (!robot.bells.includes(obj.bell)) {
          bell.takenover = true;
        }
        state.place = obj.place+1;
        if (state.place === numbells) state.place = 0;
        bell.stroke *= -1;
      }
      
    });
    
    socket.on("penultimate", n => {
      if (n === state.rownum) {
        state.rownum++;
        let robot = entrants.find(o => o.name === "Sidra🤖");
        if (robot && robot.rownum === state.rownum) {
          robot.rownum++;
          if (!state.stop && state.playing) {
              
            //io.emit("nextrow", emitrow());
          } else if (state.playing) {
            state.stop--;

            if (state.stop === 0) {
              state.playing = false;
              //io.emit("that's all", state);
            }
          }
        }
        
      } else {
        //console.log("unaligned rownum");
      }
    });
    
    socket.on("stand", () => {
      state.bells.forEach(b => b.stroke = 1);
      io.emit("stand", 1);
    });
    
    socket.on("chat", (obj) => {
      console.log("chat");
      state.chat += obj.name+": "+obj.message+ "\n";
      io.emit("chat", obj);
    });
    
    socket.on("stage", (n) => {
      numbells = n;
      state.numbells = n;
      setstate("tower");
      io.emit("stagechange", state);
    });
    
    socket.on("duration", (n) => {
      console.log("duration change "+n);
      state.duration = n;
      io.emit("duration", n);
    });
    
    socket.on("method", (m) => {
      rowArray(m, numbells);
      state.method = m;
      addRobot("method");
      io.emit("method", m);
      io.emit("rowArr", state.rowArr);
    });
    socket.on("placenot", (o) => { //o needs to have pn and stage
      
      let method = {title: o.pn, pn: parsepn(o), stage: o.stage};
      if (method.pn) {
        rowArray(method, numbells);
        state.method = method;
        addRobot("method");
        io.emit("method", method);
        io.emit("rowArr", state.rowArr);
      } else {
        console.log(o);
        //invalid pn
        socket.emit("method", method);
      }
      
    });
    socket.on("complib", id => {
      complib(id, (composition) => {
        if (composition && composition.stage < 13) {
          if (composition.stage > numbells) {
            numbells = composition.stage % 2 === 0 ? composition.stage : composition.stage+1;
            state.numbells = numbells;
            setstate("tower");
            io.emit("stagechange", state);
          }
          state.comp = composition;
          addRobot("comp");
          io.emit("composition", composition);
          io.emit("rowArr", state.rowArr);
          
        } else {
          socket.emit("composition", {error: composition ? "Stage is too high" : "Error finding composition"});
        }
      });
    });
    
    socket.on("robotopts", robotopts => {
      //console.log(robotopts);
      state.robotopts = robotopts;
      calcspeed(robotopts.hours, robotopts.minutes);
      buildrowarr(state.simulator);
      io.emit("robotopts", robotopts);
      io.emit("rowArr", state.rowArr);
    });
    
    //start robot
    socket.on("start", () => {
      state.playing = true;
      io.emit("start");
    });
    
    socket.on("stop", (num) => {
      state.playing = false;
      state.rownum = num;
      io.emit("stop", state);
    });
    
    socket.on("reset", () => {
      addRobot(state.simulator);
      
    });
    
    function addRobot(w) {
      state.simulator = w;
      io.emit("reset");
      state.rownum = 0;
      state.roundscount = 0;
      state.stop = false;
      
      if (!entrants.find(o => o.name === "Sidra🤖")) {
        let o = {name: "Sidra🤖", bells: [], rownum: 1};
        entrants.push(o);
        io.emit("entrance", {info: o});
        state.robotopts = {
          hours: 3,
          minutes: 0,
          roundsrows: 2,
          stopatrounds: false,
          nthrounds: 1
        };
        
      } else {
        let robot = entrants.find(o => o.name === "Sidra🤖");
        robot.rownum = 1;
      }
      buildrowarr(w);
    }
    
    function disconnect(id) {
      let i = entrants.findIndex(e => e.id === id);
      if (i > -1) {
        console.log(entrants[i].name);
        entrants[i].phones.forEach(p => {
          io.to(p).emit("phoneclose", "parent disconnected :-(");
        });
        io.emit("exit", {name: entrants[i].name, exit: true});
        entrants.splice(i, 1);
        
      } else if (entrants.find(e => e.phones && e.phones.includes(id))) {
        let ringer = entrants.find(e => e.phones.includes(id));
        let j = ringer.phones.indexOf(id);
        ringer.phones.splice(j, 1);
        io.to(ringer.id).emit("closephone", id);
      }
      if (entrants.length === 0 || (entrants.length === 1 && state.simulator)) {
        state.chat = "";
        setstate("tower");
        entrants = [];
        state.simulator = false;
        
      }
      let j = limbo.indexOf(id);
      if (j > -1) limbo.splice(j,1);
    }
    
    
  });
  
}

function buildrowarr(key) {
  state.rowArr = [];
  for (let r = 0; r < state.robotopts.roundsrows-2; r++) {
    let row = [];
    for (let i = 0; i < numbells; i++) {
      row.push([i+1]);
    }
    state.rowArr.push({row: row});
  }
  let rows = state[key].rows;
  rows.forEach(o => {
    let r = {row: o.row.map(n => [n])};
    if (numbells > r.row.length) {
      for (let i = r.row.length+1; i <= numbells; i++) {
        r.row.push([i]);
      }
    }
    ["call", "name"].forEach(w => {
      if (o[w]) r[w] = o[w];
    });
    state.rowArr.push(r);
  });
  
}

function emitrow() {
  let row = [];
  let dir = 1;
  let bells = entrants.find(o => o.name === "Sidra🤖").bells;
  for (let i = 0; i < numbells; i++) {
    
    if (state.rownum < state.robotopts.roundsrows-1) {
      row.push(i+1);
    } else if (state.simulator === "comp") {
      let prevrow = state.rowArr[state.rowArr.length-1].map(a => a[0]);
      let num = i >= state.comp.stage ? prevrow[i] : state.comp.rows[state.rownum-state.robotopts.roundsrows+3].row[i];
      row.push(num);
    } else if (state.simulator === "method") {
      let prevrow = state.rowArr[state.rowArr.length-1].map(a => a[0]);
      let change = state.method.pn[(state.rownum-state.robotopts.roundsrows+1)%state.method.pn.length];
      if (change.indexOf(i+1) > -1 || (state.method.stage && i+1 > state.method.stage)) {
        row.push(prevrow[i]);
      } else {
        row.push(prevrow[i+dir]);
        dir *= -1;
      }
    }
  }
  if (state.rownum > state.robotopts.roundsrows && row.every((e,i) => e === i+1)) {
    state.roundscount++;
  }
  if (state.robotopts.stopatrounds && state.roundscount >= state.robotopts.nthrounds && state.rownum%2 === 0) {
    state.stop = 2;
  }
  state.rowArr.push(row.map(n => [n, bells.includes(n)]));
  let o = {row: row};
  if (state.simulator === "comp" && state.rownum >= state.robotopts.roundsrows) {
    o.call = state.comp.rows[state.rownum-state.robotopts.roundsrows+3].call;
  }
  if (state.simulator === "method" && state.stop) {
    o.call = "That's all!";
  }
  
  return o;
}

function calcspeed(h, m) {
    let minutes = h*60 + m;
    let wholepull = minutes / 2520;
    state.delay = wholepull * 60 / (numbells*2+1);
    state.speed = state.delay*numbells;
  }

function setstate(type) {
  let nstate = [];
  for (let i = 0; i < numbells; i++) {
    let bell = {
      num: numbells-i,
      //note: bells.filter(b => b.type === type)[i].bell,
      stroke: 1,
      ringers: []
    };
    let oldbell = state.bells.find(b => b.num === numbells-i);
    if (oldbell && entrants.length) bell.ringers = oldbell.ringers.filter(r => entrants.some(o => o.name === r));
    nstate.push(bell);
  }
  entrants.forEach(e => {
    e.bells = e.bells.filter(b => b <= numbells);
  });
  state.bells = nstate;
  state.robotopts ? calcspeed(state.robotopts.hours, state.robotopts.minutes) : calcspeed(3,0);
  if (state.simulator && state.rownum === 0) {
    state.rowArr = [[]];
    nstate.forEach(b => state.rowArr[0].unshift([b.num]));
  }
}
