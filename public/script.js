// client-side js, loaded by index.html
// run by the browser each time the page is loaded

$(function() {
  console.log("hello world :o");
  
  const socket = window.io();
  var sense = window.sense.init();
  //mabel tower bell sounds
  var soundurl = "https://cdn.glitch.com/73aed9e9-7ed2-40e5-93da-eb7538e8d42c%2F";
  //Vancouver tower sounds from method player?
  var bellurl = "https://cdn.glitch.com/0db7d9ca-f427-4a0a-8bb6-165118dc0eaf%2F";
  const stages = ["minimus", "doubles", "minor", "triples", "major", "caters", "royal", "cinques", "maximus"];
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.75;
  
  let name;
  let list = [];
  let entrants = [];
  let captain = false;
  let door = false;
  let numbells;
  let sounds = "tower";
  let view = "circle";
  let display = "animate";
  let trebleloc = "right";
  let bells;
  let mybells = [];
  let mbells = [];
  let sallies = [];
  let tails = [];
  let touchrects = [];
  
  //duration of rope animation in seconds
  let duration = 1.3;
  //duration of row in seconds
  let speed = 2.3;
  //duration between blows in seconds
  let delay;
  let latency = 0;
  let phone = false;
  let phoneid;
  let phoneids = [];
  let phonebell;
  let phonestroke = 1;
  let p = 1;
  let centerself = false;
  let centerrope;
  let width = 60;
  let zoom = 0;
  let keysdown = [];
  let touchscreen = false;
  
  let highlightself = false;
  let highlighttreble = false;
  
  let robotopts = {
    hours: 3,
    minutes: 0,
    roundsrows: 2,
    stopatrounds: false,
    nthrounds: 1,
    waitforgaps: true
  };
  let method;
  let comp;
  let huntbells = [];
  let robotbells = [];
  let ringalso = [];
  
  let playing = false;
  //current place playing
  var place = 0;
  var nextBellTime = 0.0;
  var stroke = 1;
  var timeout;
  let lookahead = 5.0;
  let schedule = 0.02;
  var rowArr = [];
  let firstcall;
  let currentcall;
  //waiting for gap to be filled
  var waiting = false;
  var checkdelay = false;
  //current row playing
  var rownum = 0;
  var waitgaps = true;
  let soundqueue = [];
  let lastplayed = 0;
  let nthrounds = 0;
  let roundscount = 0;
  let callqueue = [];
  let lastcall = "";
  let lastcallrow = 0;
  let thatsall;
  let emittime;
  let emitted = [];
  let emittimer;
  let solidme;
  let solidtreble;
  let highlightunder;
  let fadeabove;
  let displayplace;
  let instruct;
  let instructions = [];
  
  
  $("#container").on("focus", 'input', () => {
    $("#resume").show();
  });
  
  $("#container").on("blur", 'input', () => {
    if (document.activeElement.tagName === "BODY") {
      $("#resume").hide();
    }
  });
  
  $("#resume").on("click", () => {
    $("#resume").hide();
  });
  
  $(window).focus(() => {
    $("#resume").hide();
  });
  
  $(window).blur(() => {
    $("#resume").show();
  });
  
  
  // error in script!
  window.onerror = function(msg, src, lineno, colno, error) {
    let message = [
      "Message: " + msg,
      
      "Line: " + lineno,
      "Column: " + colno
    ];
    //console.log(error);
    onerror(message);
    alert("Congratulations, you've found a bug! If Alison is in the room, she should know already. If not, you might send her the message below. You'll probably have to reload to get the chamber to work again.\n" + message.join("\n"));
    return true;
  }
  
  // enter button click
  $("#enterbutton").on("click", enter);
  $("input#secret").on("keyup", (e) => {
    //console.log(e.originalEvent);
    if (e.code === "Enter") {
      enter(e);
    }
  });
  
  //assign a bell
  $("#entrants").on("change", "div.assign", function(e) {
    let n = $(this).prev("span").text();
    let arr = [];
    $(this).find("input:checked").each(function() {
      arr.push(Number($(this).val()));
    });
    
    socket.emit("assign", {name: n, bells: arr});
  });
  
  //display bell options on touchscreens
  $("#entrants").on("touchstart", "div.assign.active", function() {
    $(this).children("ul").toggleClass("block");
    $(this).parent("li").siblings("li").children("div.assign").toggleClass("hide");
  });
  
  //assign a bell to a connected phone
  $(".column").on("change", ".phone select", function(e) {
    console.log(this);
    let bell = Number($(this).find("option:checked").val());
    //if (bell) {
      let mbell = mbells.find(b => b.num === bell);
      if (mbell) mbell.phone = true;
      let id = Number(this.id.slice(5,-4));
      socket.emit("assignphone", {name: name, phoneid: phoneids.find(o => o.num === id).id, bellnum: bell, bellname: mbell ? mbell.name : null});
    //} else {
      //console.log("phone bell not emitted");
    //}
  });
  
  //click a stage
  $("#numbells li").on("click", function(e) {
    if (!playing) {
      let n = Number($(this).text());
      socket.emit("stage", n);
    }
  });
  
  //click stand button
  $("#stand").on("click", function(e) {
    if (!playing) {
      socket.emit("stand");
    }
    
  });
  
  //change stroke duration
  $("#duration").change(function() {
    duration = Number($("#duration").val());
    socket.emit("duration", Number($("#duration").val()));
  });
  
  //enter press in chat input
  $("input#chat").on("keydown", function(e) {
    if (e.code === "Enter" && $("input#chat").val().length) {
      socket.emit("chat", {name: name, message: $("input#chat").val()});
      $("input#chat").val("");
    }
  });
  

  
  
  //prevent typing in inputs from triggering a bell ring
  $("body").on("keydown", "input", function(e) {
    //e.preventDefault();
    e.stopPropagation();
  });
  
  //prevent duplication in keyboard commands
  $("#keyboard").on("keypress", "input.keyboard", function(e) {
    if (mbells.find(o => o.keys.includes(e.key))) {
      e.preventDefault();
    }
  });
  
  //update keyboard commands
  $("#keyboard").on("keyup", "input.keyboard", function(e) {
    let b = mbells.find(o => o.num === Number(this.id.slice(4)));
    if (b) {
      b.keys = $(this).val();
      console.log(b);
    }
  });
  
  //ring bell with keyboard
  $("body").on("keydown", function(e) {
    //console.log(document.activeElement.tagName);
    if (name && mybells.length) {
      let bell = mbells.find(o => o.keys.includes(e.key));
      if (bell && !bell.ringing && !keysdown.includes(e.key)) {
        keysdown.push(e.key);
        let stroke = bells.find(b => b.num === bell.num).stroke;
        if (playing && !emittime) emittime = audioCtx.currentTime;
        let o = {bell: bell.num, stroke: stroke, ringer: name, time: audioCtx.currentTime};
        emitted.push(o);
        //console.log("emitting ring from keydown "+audioCtx.currentTime);
        socket.emit("ring", o);
      } else if (bell && bell.ringing && !bell.chained && !keysdown.includes(e.key) && !ringalso.includes(bell.num)) {
        keysdown.push(e.key);
        console.log("chaining");
        let id = bells.find(b => b.num === bell.num).stroke === -1 ? "hand15b" : "back14b";
        document.getElementById(id+bell.num).addEventListener("endEvent", chainring);
        bell.chained = true;
      }
    }
  });
  
  //remove keys from keysdown array
  $("body").on("keyup", function(e) {
    let i = keysdown.indexOf(e.key);
    if (i > -1) {
      keysdown.splice(i, 1);
    }
  });
  
  
  
  //change volume
  $("#volume").on("change", function(e) {
    gainNode.gain.value = this.value;
  });
  
  //switch sounds
  $('input[name="sounds"]').on("change", function(e) {
    sounds = this.value;
    let current = bells.filter(b => b.type === sounds);
    for (let i = numbells; i > 0; i--) {
      let old = bells.find(b => b.num === i);
      current[numbells-i].num = i;
      current[numbells-i].stroke = old.stroke;
      delete old.num;
    }
  });
  
  
  //change view
  $('input[name="view"]').on("click", function(e) {
    if (playing) {
      e.preventDefault();
    } else {
      if (view != $(this).val()) {
        view = $(this).val();
        if (view === "circle") {
          $("#lineview").addClass("hidden");
          $("#roomzoom").removeClass("hidden");
          width = 60;
          $("#bells").css({"overflow": "hidden", width: "600px"});
        } else if (view === "line") {
          $("#lineview").removeClass("hidden");
          $("#roomzoom").addClass("hidden");
          width = Number($("#spacing option:checked").val());
          $("#bells").css({"overflow": "unset", width: width*numbells + "px"});
        }
        stagechange({numbells: numbells, bells: bells.filter(b => b.num)});
      }
    }
    
    
  });
  
  // change perspective on rope circle
  $("#left-right,#up-down").on("change", function() {
    let origin = $("#bells").css("-webkit-perspective-origin");
    if (origin) {
      let orig = origin.slice(0,-2).split("px ").map(n => Number(n));
      switch (this.id) {
        case "left-right":
          orig[0] = 600 - Number(this.value);
          break;
        case "up-down":
          orig[1] = this.value;
          break;
      }
      $("#bells").css("-webkit-perspective-origin", orig.join("px ")+"px");
    }
  });
  
  // change perspective on rope circle
  $("#depth").on("change", function() {
    $("#bells").css("-webkit-perspective", (1150 - this.value) + "px");
  });
  
  // change perspective on rope circle
  $("#zoom").on("change", function() {
    let to = Number(this.value);
    let change = to - zoom;
    let max = 0;
    for (let i = 1; i <= numbells; i++) {
      let current = $("#chute"+i).css("transform");
      if (current) {
        let arr = current.split(", ");
        let num = arr.length > 6 ? Number(arr[arr.length-2]) : 0;
        max = Math.max(max, change+num);
        $("#chute"+i).css("transform", "translateZ("+(change + num)+"px)");
      } else {
        
      }
    }
    zoom = max;
  });
  
  
  //change direction of line view
  $('input[name="trebleloc"]').on("change", function(e) {
    trebleloc = $('input[name="trebleloc"]:checked').val();
    rearrange(true);
  });
  
  //center self in line view
  $('input[name="centerself"]').on("change", function() {
    if ($(this).is(":checked")) {
      centerself = true;
    } else {
      centerself = false;
    }
    rearrange(false);
  });
  
  //change sally color
  $("#solidme,#solidtreble").on("click", sallycolor);
  
  //highlight the bell to follow or fade ropes above
  $("#highlightunder,#fadeabove").on("click", function() {
    highlightunder = $("#highlightunder").prop("checked");
    fadeabove = $("#fadeabove").prop("checked");
    if (!highlightunder && !fadeabove) {
      $("#fadeabove,#highlightunder").prop("disabled", false);
      for (let i = 1; i <= numbells; i++) {
        $("#chute"+i).css("opacity", 1);
      }
    } else if (highlightunder) {
      $("#fadeabove").prop("disabled", true);
      if (rownum === 0) {
        highlight(mybells[0]-1);
      }
    } else if (fadeabove) {
      $("#highlightunder").prop("disabled", true);
      if (rownum === 0) {
        let arr = bells.filter(b => b.num && b.num > mybells[0]).map(b => b.num);
        fadeout(arr);
      }
    }
  });
  
  $("#displayplace").on("click", function() {
    displayplace = $(this).prop("checked");
    if (displayplace) {
      mybells.forEach(b => {
        $("#chute"+b).append(`<div id="instruct${b}" class="instruct"></div>`);
        if (rownum === 0) {
          $("#instruct"+b).text(b === 1 ? "Lead" : b === 2 ? "2nd" : b === 3 ? "3rd" : b+"th");
        }
      });
      
    } else {
      $("div.instruct").remove();
    }
  });
  
  $("#instructions").on("click", function() {
    instruct = $(this).prop("checked");
    if (instruct && mybells[0]) {
      setupInstruct();
    } else {
      $("#displayplace").prop("disabled", false);
    }
  });
  
  
  
  //change spacing in line view
  $("#spacing").change(function() {
    width = $("#spacing option:checked").val();
    for (let i = 1; i <= numbells; i++) {
      let bell = bells.find(b => b.num === i);
      document.getElementById("rope"+bell.num).setAttributeNS(null, "width", width);
      let view = [0,bell.stroke === 1 ? 0 : 173.7, width, 500].join(" ");
      document.getElementById("rope"+bell.num).setAttributeNS(null, "viewBox", view);
    }
    $(".bellnum").css("width", width+"px");
  });
  
  
  
  
  //enter place notation
  document.querySelector('#placenot').addEventListener('change', function(e) {
    let val = $("#placenot").val();
    let stage = stages.indexOf($("#stage").val()) + 4;
    console.log($("#stage").val());
    if (stage > 3 && /^[\d,&\.\+etx\-]+$/i.test(val)) {
      $("#method > p").text("Loading...");
      socket.emit("placenot", {pn: val, stage: stage});
    } else {
      $("#method > p").text("Invalid place notation");
    }
  });
  
  //enter complib composition id
  document.querySelector('#complib').addEventListener('change', function(e) {
    let val = $("#complib").val();
    if (/^\d+$/.test(val)) {
      $("#method > p").text("Loading...");
      socket.emit("complib", val);
    }
  });
  
  //search for a method title
  document.querySelector('#methodname').addEventListener('change', function(e) {
    let val = $("#methodname").val();
    if (val.length && val.includes(" ") && /[a-z]/i.test(val)) {
      $("#method > p").text("Loading...");
      let xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://vivacious-port.glitch.me/find/method?title%5B%24regex%5D=%5E'+val.split(" ").join("+")+'&title%5B%24options%5D=i', true);
      xhr.send();
      
      xhr.onload = function () {
        let res = xhr.responseText;
        if (res) {
          res = JSON.parse(res);
          method = {};
          method.title = res.title;
          method.pn = res.pnFull;
          method.stage = res.stage;
          method.hunts = res.huntBells;
          socket.emit("method", method); ///////
        } else {
          $("#method > p").text("Method not found");
        }
      }
      xhr.onerror = function () {
        $("#method > p").text("Error searching for method");
      }
    } else {
      $("#method > p").text("Invalid method title");
    }
    
  });
  
  //change simulator settings
  $('div#simulator input').on("change", function() {
    if (this.id === "stopatrounds") {
      robotopts.stopatrounds = $(this).prop("checked");
      socket.emit("robotopts", robotopts);
    } else if (this.id === "waitforgaps") {
      robotopts.waitforgaps = $(this).prop("checked");
      socket.emit("robotopts", robotopts);
    } else {
      robotopts[this.id] = Number($(this).val());
      if (this.id === "nthrounds" && robotopts.nthrounds > 1) {
        robotopts.stopatrounds = true;
        $("#stopatrounds").prop("checked", true);
      }
      if (robotopts.stopatrounds || this.id != "nthrounds") {
        socket.emit("robotopts", robotopts);
      }
    }
  });
  
  //fill in the robot on unassigned bells
  $("#fillin").on("click", function() {
    let arr = [];
    robotbells.forEach(b => arr.push(b));
    for (let i = 1; i <= numbells; i++) {
      if (!entrants.find(o => o.bells.includes(i))) {
        arr.push(i);
        socket.emit("assign", {name: "Sidra🤖", bells: arr});
      } else if (entrants.find(o => o.name != "Sidra🤖" && o.bells.includes(i)) && arr.includes(i)) {
        let j = arr.indexOf(i);
        arr.splice(j, 1);
        socket.emit("assign", {name: "Sidra🤖", bells: arr});
      }
    }
  });
  
  //start or stop robot
  $("#start").on("click", function() {
    if (!playing) {
      socket.emit("start");
      
    } else {
      socket.emit("stop", rownum);
    }
    
  });
  
  //reset robot
  $("#reset").on("click", function() {
    if (!playing) {
      socket.emit("reset");
    }
  });
  
  
  /* SOCKETS */
  
  //get list of names currently in use
  socket.on("names", (nn) => {
    list = nn;
  });
  
  //get bells
  socket.on("bells", arr => {
    if (!door && name) {
      socket.emit("reenter", {name: name, bells: mybells});
    } else {
      bells = arr.map(b => {
        b.url = b.type === "tower" ? bellurl + b.url : soundurl + b.url;
        return b;
      });
      setupSample(0);
    }
    
  });
  
  //get current number of bells
  socket.on("numbells", stagechange);
  
  //set rope animation duration
  socket.on("duration", n => {
    if (!phone) {
      duration = n;
      for (let n = 0; n < numbells; n++) {
        for (let i = 0; i < 15; i++) {
          ["hand","back"].forEach(s => {
            let j = s === "hand" ? i+1 : i;
            let elem = document.getElementById(s+j+"b"+n);
            if (elem) elem.setAttributeNS(null, "dur", setdur(s,i)+"s");
          });
        }
      }
      
    }
  });
  
  
  socket.on("ping", () => {
    //console.log("ping sent");
    if (door) socket.emit("test", Date.now());
  });
  
  
  socket.on("pong", (n) => {
    if (door) {
        if (n > latency) {
        socket.emit("latency", {name: name, latency: n});
      }
      latency = n;
    }
  });
  
  socket.on("time", (n) => {
    console.log(Date.now()-n);
  });
  
  //name already in use
  socket.on("duplicate", () => {
    $("#wait").addClass("hidden");
    $("#name,#secret").prop("disabled", false);
    $("#name").val("");
    $("#name").attr("placeholder", '"'+name+'" already in use; pick another name');
  });
  
  
  //secret was wrong
  socket.on('wrong', () => {
    $("#wait").addClass("hidden");
    $("#name,#secret").prop("disabled", false);
    $("#secret").val("");
    $("#secret").attr("placeholder", "invalid secret");
  });
  
  //this socket enters
  socket.on("open", (obj) => {
    door = true;
    entrants = obj.entrants;
    numbells = obj.state.numbells;
    duration = obj.state.duration;
    speed = obj.state.speed;
    delay = speed/numbells;
    stagechange(obj.state);
    if (entrants.find(o => o.name === name).conductor) {
      captain = true;
      $(".conduct").show();
    }
    updatelist(entrants);
    emittimer = requestAnimationFrame(checklatency);
    if (obj.state.simulator) {
      updaterobot(obj.state.robotopts);
      $("#simulator").removeClass("hidden");
      $(".displayplace").removeClass("hidden");
      let text;
      switch (obj.state.simulator) {
        case "method":
          method = obj.state.method;
          text = "Current method: "+method.title;
          firstcall = obj.state.method.rows[0].call;
          break;
        case "comp":
          text = "Composition: "+obj.state.comp.title;
          firstcall = obj.state.comp.rows[0].call;
          break;
      }
      $("#method > p").text(text);
      rowArr = obj.state.rowArr;
      rownum = obj.state.rownum;
      place = obj.state.place || 0;
      if (rownum > 0) $("#reset").removeClass("disabled");
    }
    
    $("#enter").hide();
    $("#resume").hide();
    $("#container").show();
  });
  
  socket.on("reopen", state => {
    door = true;
    console.log("rownum: "+state.rownum);
    console.log(rownum);
    console.log("client stroke: "+stroke);
    if (entrants.find(o => o.name === name).conductor) {
      captain = true;
      $(".conduct").show();
    }
    if (state.simulator) {
      $("#simulator").removeClass("hidden");
      $(".displayplace").removeClass("hidden");
    }
    $("#enter").hide();
    $("#resume").hide();
    $("#closed").hide();
    $("#container").show();
  });
  
  //this phone socket enters
  socket.on("phoneopen", (obj) => {
    door = true;
    phone = true;
    $("#enter").hide();
    $("#phoneinfo").append(`<h3>${name}'s phone</h3>`);
    $("#phoneinfo").removeClass("hidden");
  });
  
  //this phone socket assigned
  socket.on("phoneassign", (obj) => {
    console.log(obj);
    if (obj.bellname && door) {
      phonebell = obj.bellnum;
      $("#phoneinfo .bellname").remove();
      $("#phoneinfo").append(`<h3 class="bellname">Bell ${obj.bellnum}</h3>`);
      sense.fling({off: true}, phonering);
      sense.fling({interval: 300, sensitivity: 0.8}, phonering);
    } else if (door) {
      phonebell = null;
      $("#phoneinfo .bellname").remove();
      sense.fling({off: true}, phonering);
    }
    
    function phonering(data) {
      console.log(data);
      socket.emit("ring", {bell: obj.bellnum, stroke: phonestroke, ringer: name});
    }
  });
  
  //someone else enters
  socket.on("entrance", (m) => {
    if (entrants.length) {
      updateentrant(m.info, true);
      if (m.info.name === "Sidra🤖") {
        $("#simulator").removeClass("hidden");
        $(".displayplace").removeClass("hidden");
        if (mybells.length === 1) {
          $(".following").removeClass("hidden");
        }
      }
    }
    
  });
  
  //someone else leaves
  socket.on("exit", (m) => {
    if (entrants.length) {
      updateentrant(m, false);
    }
  });
  
  //phone connected to this computer socket
  socket.on("phone", (obj) => {
    phoneids.push({id: obj.id, num: p});
    
    //entrants.find(o => o.name === name).phones = phoneids;
    
    let after = phoneids.length === 1 ? "div#keyboard" : "div#phone"+(phoneids[phoneids.length-2].num);
      let options = `<option></option>`;
      mbells.forEach(b => {
        options += `<option value="${b.num}">${b.num}</option>`;
      });
      let div = `<div id="phone${p}" class="phone">
          <h4>
            Phone
          </h4>
          <label for="phone${p}bell">Bell: </label><select id="phone${p}bell" >
            ${options}
          </select>
        </div>`;
      $(div).insertAfter($(after));
    p++;
  });
  
  //this socket disconnects
  socket.on("disconnect", (r) => {
    console.log(r);
    if (["io server disconnect", "io client disconnect"].includes(r)) {
      $("#closed > h3").text("Connection error - try reloading to enter.");
    } else {
      setTimeout(function() {
        if (!door) {
          $("#closed > h3").text("Reconnect failed - try reloading to enter.");
        }
      }, 3000);
    }
    door = false;
    captain = false;
    $("#container").hide();
    $("#enter").hide();
    $("#phoneinfo").hide();
    $("#closed").show();
    
    
    
  });
  
  //a phone connected to this socket closes
  socket.on("closephone", (id) => {
    let i = phoneids.findIndex(o => o.id === id);
    $("#phone"+phoneids[i].num).remove();
    phoneids.splice(i, 1);
  });
  
  //this phone socket closes
  socket.on("phoneclose", (r) => {
    door = false;
    $("#phoneinfo").hide();
    $("#closed").show();
  });
  
  //change stage
  socket.on("stagechange", stagechange);
  
  
  //any socket is assigned
  socket.on("assignment", (obj) => {
    if (entrants.length) {
      updateentrant(obj);
      if (obj.name === name) {
        assign(obj);
        if (view === "line" && centerself) { 
          rearrange(false);
        }
      }
    }
    //console.log(bells);
    
    
  });
  
  //stand command received
  socket.on("stand", standbells);
  
  //ring a bell
  socket.on("ring", pull);
  
  //method or place notation set
  socket.on("method", o => {
    if (name) {
      
      if (o.pn) {
        comp = null;
        method = o;
        firstcall = o.rows[0].call;
        huntbells = o.hunts ? o.hunts : [];
        //console.log(o.pn);
        $("#method > p").text("Current method: "+method.title);
        $("#stopatrounds,#nthrounds").prop("disabled", false);
        if (instruct) {
          setupInstruct();
        }
      } else {
        $("#method > p").text("Invalid place notation");
      }
      
    }
  });
  
  //composition set
  socket.on("composition", o => {
    if (o.error) {
      $("#method > p").text(o.error);
    } else {
      method = null;
      huntbells = [];
      comp = o;
      $("#method > p").text("Composition: "+o.title);
      firstcall = o.rows[0].call;
      $("#stopatrounds").prop("checked", true);
      $("#nthrounds").val(1);
      $("#stopatrounds,#nthrounds").prop("disabled", true);
      if (instruct && mybells[0]) {
        setupInstruct();
      }
    }
  });
  
  socket.on("rowArr", o => {
    //console.log(o);
    rowArr = o;
  });
  
  //new row received
  socket.on("nextrow", o => {
    if (playing) {
      //console.log(o);
      rowArr.push(o.row.map(n => [n]));
      
      currentcall = o.call ? o.call : " ";
      
      if (waiting) {
        waiting = false;
        nextBellTime = Math.max(audioCtx.currentTime, nextBellTime);
        scheduler();
      }
      
    }
    
  });
  
  //update robot settings
  socket.on("robotopts", updaterobot);
  
  //start the robot
  socket.on("start", () => {
    if (!playing) {
      //console.log(robotbells);
      playing = true;
      $("#start").text("Stop");
      $("#reset").addClass("disabled");
      $("#simulator input").prop("disabled", true);
      $("div#method input,div.conduct input").prop("disabled", true);
      $("div.assign.active:hover > ul.dropdown").css("display", "none");
      
      //if (myrobot) {
        if (rownum === 0) {
          nextBellTime = audioCtx.currentTime;
          if (robotbells.includes(1)) {
            place = -2;
            
            waiting = false;
            scheduler();
            requestAnimationFrame(movehighlight);
          } else {
            waiting = true;
            requestAnimationFrame(movehighlight);
          }
        } else {
          nextBellTime = audioCtx.currentTime;
          scheduler();
          requestAnimationFrame(movehighlight);
        }
        
      //}
    
    } 
  });
  
  //stop the simulator
  socket.on("that's all", () => {thatsall = true;});
  socket.on("stop", thatisall);
  
  //reset the simulator
  socket.on("reset", () => {
    $("#reset").addClass("disabled");
    $("#display").text("");
    $("#callcontainer").text("");
    standbells(1);
      
      rownum = 0;
      place = 0;
    roundscount = 0;
    lastcall = "";
    lastplayed = -1;
    stroke = 1;
    thatsall = false;
    currentcall = null;
    bells.forEach(b => {
      if (b.num) {
        document.getElementById("hand15b"+b.num).removeEventListener("endEvent", chainring);
        document.getElementById("back14b"+b.num).removeEventListener("endEvent", chainring);
      }
    });
    rowArr.forEach(o => {
          o.row.forEach(a => {
            a[1] = false;
          });
        });
  });
  
  //chat message received
  socket.on("chat", obj => {
    let message = obj.name+": "+obj.message+ "\n";
    document.querySelector("textarea").value += message;
  });
  
  
  // BEGIN FUNCTIONS
  
  //attempt to enter the chamber
  function enter(e) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    requestDeviceMotion();
    name = $("#name").val();
    let badchar = !/^[a-z]/i.test(name);
    let secret = $("#secret").val();
    if (name.length && !/^\s+$/.test(name) && secret.length && !/^[^\w]+$/.test(secret) && !badchar) {
      
      socket.emit("entrant", {name: name, secret: secret});
      $("#wait").removeClass("hidden");
      $("#name,#secret").prop("disabled", true);
    } else {
      $("#name").val("");
      $("#secret").val("");
      $("#name").attr("placeholder", badchar ? "name must begin with a letter" : "invalid name or wrong secret");
    }
    
  }
  
  function onerror(e) {
    socket.emit("error", {error: e});
  }
  
  function remove(e) {
    if (e) {
      e.removeEventListener("click", emitring);
      e.removeEventListener("mouseenter", pointer);
    }
  }
  
  function removetouch(e) {
    if (e) {
      e.removeEventListener("touchstart", emitring);
      e.removeEventListener("touchmove", prevent);
      e.removeEventListener("touchleave", prevent);
      e.removeEventListener("touchcancel", prevent);
      e.removeEventListener("touchend", prevent);
    }
  }
  
  function prevent(e) {
    e.preventDefault();
  }
  
  function pointer(e) {
    let num = this.id.startsWith("sally") ? Number(this.id.slice(5)) : Number(this.id.slice(4));
    let bell = bells.find(b => b.num === num);
    if ((this.id.startsWith("sally") && bell.stroke === 1) || (this.id.startsWith("tail") && bell.stroke === -1)) {
      this.style.cursor = "pointer";
    } else {
      this.style.cursor = "auto";
    }
  }
  
  //emit ring from a click
  function emitring(e) {
    if (e.type === "touchstart") {
      e.preventDefault();
    }
    let num = this.id.startsWith("sally") ? Number(this.id.slice(5)) : Number(this.id.slice(4));
    let bell = bells.find(b => b.num === num);
    let o = {bell: bell.num, ringer: name, time: audioCtx.currentTime}
    if ((this.id.startsWith("sally") || this.id.startsWith("hand")) && bell.stroke === 1) {
      o.stroke = 1;
      
    } else if ((this.id.startsWith("tail") || this.id.startsWith("back")) && bell.stroke === -1) {
      o.stroke = -1;
    }
    emitted.push(o);
    socket.emit("ring", o);
  }
  
  function checklatency() {
    if (emitted.length && emitted[emitted.length-1].time+0.2 < audioCtx.currentTime) {
      $("#display").text("Sorry, server not responding!");
    } else {
      $("#display").text("");
    }
    requestAnimationFrame(checklatency);
  }
  
  //build list of entrants
  function updatelist(m) {
    $("#entrants li").remove();
    m.forEach((e) => {
      if (e.name === name && e.conductor) {
        captain = true;
        $("#numbells li:hover").css("cursor", "pointer");
      }
      let c = e.conductor ? " (C)" : "";
      let d = captain || e.name === name || e.name === "Sidra🤖" ? ' active"' : '"';
      let b = e.bells.length ? e.bells.join(",") : "no bells";
      $("#entrants").append('<li id="'+e.name.replace(/ /g, "")+'"><span>'+e.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">'+b+'</span>' + selectOpts(e.name.replace(/ /g, ""), e.bells) +'</div></li>');
      if (e.name === "Sidra🤖") robotbells = e.bells;
    });
  }
  
  function selectOpts(name, n) {
    let opts = `
      <ul class="dropdown">
      `;
    for (let i = 1; i <= numbells; i++) {
      let s = n.includes(i) ? " checked " : "";
      opts += `<li><input type="checkbox" id="${name+"-"+i}" value="${i}"${s} /><label for="${name+"-"+i}">${i}</label></li>
`
    }
    opts += `</ul>`;
    return opts;
  }
  
  function updateentrant(o, isnew) {
    if (isnew) {
      entrants.push(o);
      let c = o.conductor ? " (C)" : "";
      let d = captain || o.name === name || o.name === "Sidra🤖" ? ' active"' : '"';
      $("#entrants").append('<li id="'+o.name.replace(/ /g, "")+'"><span>'+o.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">no bells</span>' + selectOpts(o.name.replace(/ /g, ""), o.bells) +'</div></li>');
      
    } else {
      let li = $("li#"+o.name.replace(/ /g, ""));
      let j = entrants.findIndex(e => e.name === o.name);
      if (o.exit) {
        li.remove();
        entrants.splice(j, 1);
      } else {
        let text = o.bells && o.bells.length ? o.bells.join(",") : "no bells";
        li.find("span.summary").text(text);
        for (let i = 1; i <= numbells; i++) {
          $("input#"+o.name.replace(/ /g, "")+"-"+i).prop("checked", o.bells && o.bells.includes(i));
        }
        if (o.bells) entrants[j].bells = o.bells;
        if (o.name === "Sidra🤖") robotbells = o.bells;
      }
    
    }
  }
  
  let interval;
  //rotate the ropes displayed
  function rotate(old) {
    if ((mybells.length && (Math.min(...mybells) != old[0] || mybells.length != old.length) ) ) { //|| (mybells.length === 0 && old != 1)
      let center = mybells.length ? Math.min(...mybells) : 1;
      centerrope = [center];
      if (mybells.length > 1) centerrope.push(center === numbells ? 1 : center+1);
      
      for (let i = 0; i < numbells; i++) {
        let num = center+i;
        if (num > numbells) num -= numbells;
        position(i, num);
      }
      $("#zoom").val(0);
      zoom = 0;
    }
  }
  
  
  //rearrange the line of ropes
  function rearrange(rev) {
    let svgs = [];
    let nums = [];
    for (let i = numbells; i > 0; i--) {
      svgs.push($("#bells > svg:nth-child("+i+")").detach());
      nums.push($("#display3 .bellnum:nth-child("+i+")").detach());
    }
    if (!rev) {
      svgs.reverse();
      nums.reverse();
    }
    let centernum = centerself && mybells.length ? Math.min(...mybells) : numbells/2;
    let i = trebleloc === "right" ? numbells/2 : numbells/2 - 1;
    let bell = bells.find(b => b.num === centernum);
    
    let j = 0;
    while (bell.num !== Number(svgs[i].attr("id").slice(4)) && j < numbells) {
      svgs.push(svgs.shift());
      nums.push(nums.shift());
      j++;
    }
    svgs.forEach(s => {
      $("#bells").append(s);
    });
    nums.forEach(n => {
      $("#display3").append(n);
    });
    
    if (rev && mbells.length) {
      let k = ["j", "f"];
      if (trebleloc === "left") k.reverse();
      for (let i = 0; i < 2; i++) {
        let b = mbells[i].num;
        if (mbells[i].keys.includes(k[1-i])) mbells[i].keys = (b < 10 ? b.toString() : b === 10 ? "0" : b === 11 ? "-" : "=") + k[i];
      }
    }
  }
  
  function stagechange(o) {
    
    numbells = o.numbells;
    //remove things
    $("#display3 div").remove();
    $("#bells div").remove();
    $(".phone option").remove();
    $(".assign ul.dropdown").remove();
    
    let current = bells.filter(b => b.type === sounds);
    bells.forEach(b => delete b.num);
    
    //circle view info
    let start = mybells.filter(b => b <= numbells).length ? Math.min(...mybells.filter(b => b <= numbells)) : 1;
    centerrope = [start];
    let radius = 270; //update this for non-div by 4 stages
    let zrad = 200;
    //line view info
    let centernum = centerself && mybells.length ? Math.min(...mybells) : numbells/2;
    let offset = (centernum + numbells/2)%numbells;
    //add ropes and bell numbers
    for (let i = 0; i < numbells; i++) {
      let j, num;
      if (view === "line") {
        j = trebleloc === "right" ? (i+numbells-offset)%numbells : (2*numbells-1+offset-i)%numbells;
        num = trebleloc === "right" ? (2*numbells-i+offset)%numbells : (i+1+numbells-offset)%numbells;
        if (num === 0) num = numbells;
        bellnums(num);
      } else if (view === "circle") {
        num = start + i;
        if (num > numbells) num -= numbells;
        j = numbells - num;
      }


      current[j].num = num;
      current[j].stroke = o.bells.find(b => b.num === num).stroke;
      addrope(current[j]);
      let handstroke = document.getElementById("hand8b"+current[j].num);
      handstroke.removeEventListener("beginEvent", ring);
      handstroke.addEventListener("beginEvent", ring);
      let backstroke = document.getElementById("back11b"+current[j].num);
      backstroke.removeEventListener("beginEvent", ring);
      backstroke.addEventListener("beginEvent", ring);

      if (view === "circle") {
        position(i, num);
      }
    }
    $("#bells").append('<div id="callcontainer"></div>');
    if (view === "line") {
      $("#bells").css({"overflow": "unset", width: width*numbells + "px"});
      $(".bellnum").css("width", width+"px");
    } else if (view === "circle") {
      $("#bells").css({"overflow": "hidden", width: "600px"});
      $(".chute:first-child").css("z-index", 10);
      $("#zoom").val(0);
      zoom = 0;
    }
    $("#numbells li").css({color: "black", "background-color": "white"});
    let stage = stages[(numbells-4)];
    $("li#"+stage).css({color: "white", "background-color": "black"});

    for (let i = 0; i < entrants.length; i++) {
      entrants[i].bells = entrants[i].bells.filter(b => b <= numbells);
      $("li#"+entrants[i].name.replace(/ /g, "")+ " > div.assign").append(selectOpts(entrants[i].name.replace(/ /g, ""), entrants[i].bells));
      updateentrant(entrants[i]);
      if (entrants[i].name === name) {
        assign(entrants[i]);
      }
    }
    calcspeed(robotopts.hours, robotopts.minutes);
    
  }
  
  //add a bell number above the rope
  function bellnums(n) {
    let elem = `<div class="bellnum">${n}</div>`;
    $("#display3").append(elem);
  }
  
  function position(i, num) {
    let radius = 270; //update this for non-div by 4 stages
    let zrad = 200;
    let angle = 2*Math.PI/numbells*i;
    if (mybells.length > 1) {
      angle -= Math.PI/numbells;
      centerrope.push(centerrope[0] === numbells ? 1 : centerrope[0]+1);
    }
    let left = radius - radius * Math.sin(angle);
    let z = Math.cos(angle*-1) * zrad - zrad;
    let bell = bells.find(b => b.num === num);
    bell.left = left;
    bell.z = z;
    $("#chute"+num).css({"left": left+"px", transform: "translateZ("+z+"px)"});
  }
  
  function standbells(n) {
    if (bells) {
      for (let i = 1; i <= numbells; i++) {
        let bell = bells.find(b => b.num === i);
        if (bell.stroke !== n) {
          pull({bell: i, stroke: -1*n});
        }
      }
    }
  }
  
  //assign a bell to me
  function assign(me) {
    let old = centerrope;
    if (me && me.bells) {
      //console.log(me.bells);
      //remove stuff
      sallies.forEach(remove);
      tails.forEach(remove);
      touchrects.forEach(removetouch);
      mybells.forEach(b => {
        let i = mbells.findIndex(m => m.num === b);
        if (b <= numbells) {
          ["hand15b", "back14b"].forEach(id => {
            document.getElementById(id+mbells[i].num).removeEventListener("endEvent", endpull);
          });
        }
        
        if (!me.bells.includes(b)) {
          $('.phone option[value="'+b+'"]').remove();
          $('label[for="bell'+b+'"]').parent("li").remove();
          mbells.splice(i, 1);
        }
      });
      mybells = mybells.filter(b => me.bells.includes(b));
      sallies = [];
      tails = [];
      touchrects = [];
      
      //add stuff
      me.bells.forEach(b => {
        let bell = bells.find(be => be.num === b);
        let keys = b < 10 ? b.toString() : b === 10 ? "0" : b === 11 ? "-" : "="; //+(i===0 ? "j" : i===1 ? "f" : "")
        sallies.push(document.getElementById("sally"+bell.num));
        tails.push(document.getElementById("tail"+bell.num));
        touchrects.push(document.getElementById("hand"+bell.num), document.getElementById("back"+bell.num));
        ["hand15b", "back14b"].forEach(id => {
          document.getElementById(id+bell.num).addEventListener("endEvent", endpull);
        });
        let mbell = mbells.find(mb => mb.num === b);
        if (mbell) {
          mbell.name = bell.bell;
          mbell.keys = keys;
        }
        if (!mybells.includes(b)) {
          
          //console.log(bell);
          
          $(".phone select").append(`<option value="${b}">${b}</option>`);
          
          mbells.push({num: b, name: bell.bell, keys: keys});
          mybells.push(b);
        }
      });
      
      sallies.forEach(s => {
          s.addEventListener("mouseenter", pointer);
          s.addEventListener("click", emitring);
        });
        
        tails.forEach(t => {
          t.addEventListener("mouseenter", pointer);
          t.addEventListener("click", emitring);
        });
      let touchevents = ["touchmove", "touchleave", "touchend", "touchcancel"];
      touchrects.forEach(t => {
        t.addEventListener("touchstart", emitring);
        touchevents.forEach(e => {
          t.addEventListener(e, prevent);
        });
      });
      mbells.sort((a,b) => {b.num-a.num});
      let keys = ["j", "f"];
      for (let i = 0; i < 2; i++) {
        let k = trebleloc === "right" ? keys[i] : keys[1-i];
        if (mbells[i] && !mbells.map(m => m.keys).join("").includes(k)) mbells[i].keys += k;
      }
      mbells.forEach(b => {
        if ($("#bell"+b.num).length === 0) {
          let li = `<li><label for="bell${b.num}">bell ${b.num}:</label><input type="text" id="bell${b.num}" value="${b.keys}" class="keyboard" /></li>`;
          $("#keyboard ul").append(li);
        }
        
      });
    }
    if (view === "circle") rotate(old);
    sallycolor();
    if (mybells.length === 1 && entrants.find(e => e.name === "Sidra🤖")) {
      $(".following").removeClass("hidden");
      //$("#highlightunder").click();
    } else {
      $(".following").addClass("hidden");
    }
    if (instruct && mybells[0]) {
      setupInstruct();
    }
  }
  
  function setupInstruct() {
    $(".instruct").remove();
    displayplace = false;
    $("#displayplace").prop("checked", false);
    $("#displayplace").prop("disabled", true);
    describe(method ? method.rows : comp.rows, mybells[0], method ? method.stage : comp.stage);
    $("#chute"+mybells[0]).append(`<div id="instruct${mybells[0]}" class="instruct"></div>`);
  }
  
  function calcspeed(h, m) {
    let minutes = h*60 + m;
    let wholepull = minutes / 2520;
    delay = wholepull * 60 / (numbells*2+1);
    speed = delay*numbells;
    console.log("delay "+delay);
  }
  
  async function getFile(audioContext, filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }
  
  //create sound buffers for all the bells
  async function setupSample(i) {
    let arrayBuffer = await getFile(audioCtx, bells[i].url);
    audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
      bells[i].buffer = buffer;
      if (i < bells.length-1) {
        i++;
        setupSample(i);
      } else {
        console.log("finished setting up");
        
      }
    }, (e) => { console.log(e) });
  }
  
  
  function pull(obj, t) {
    if (name && !phone) {
      //console.log(obj);
      let id = (obj.stroke === 1 ? "hand1b" : "back0b") + obj.bell;
      let bell = bells.find(b => b.num === obj.bell);
      if (obj.ringer && ringalso.includes(obj.bell)) {
        let j = ringalso.indexOf(obj.bell);
        ringalso.splice(j, 1);
        console.log(ringalso);
      }
      if (obj.time && obj.ringer === name) {
        let j = emitted.findIndex(o => o.time === obj.time);
        if (j > -1) {
          //emitted.splice(j, 1); //or 0,j+1 ?
          emitted.splice(0,j+1);
        }
      }
      if (bell && bell.stroke === obj.stroke) {
        //if (mybells.includes(obj.bell)) console.log(audioCtx.currentTime);
        let mbell = mbells.find(b => b.num === obj.bell);
        if (mbell) {
          if (!obj.ringer) {
            //document.getElementById(id).removeEventListener("endEvent", chainring); //wrong id!!!
            //mbell.chained = false;
          }
          emittime = null;
          
          if ($("#display").text().startsWith("Sorry")) $("#display").text("");
          mbell.ringing = true;
          if (playing && rowArr[rownum+1]) {
            let p = rowArr[rownum].row.findIndex(a => a[0] === obj.bell);
            let row = rowArr[rownum].row[p][1] ? rowArr[rownum+2] : rowArr[rownum+1];
            let i = row ? row.row.findIndex(a => a[0] === obj.bell) : -1;
            if (highlightunder) {
              let n = i > 0 ? row.row[i-1][0] : i === 0 ? obj.bell : null;
              if (n) highlight(n);
            } else if (fadeabove) {
              let fade = i > -1 ? row.row.slice(i+1).map(a => a[0]) : [];
              if (fade) fadeout(fade);
            }
            if (displayplace) {
              let b = i+1;
              $("#instruct"+obj.bell).text(b === 0 ? "???" : b === 1 ? "Lead" : b === 2 ? "2nd" : b === 3 ? "3rd" : b+"th");
            }
            if (instruct) {
              let j = rownum-robotopts.roundsrows+2;
              if (rowArr[rownum].row[p][1]) j++;
              if (instructions[j]) {
                let text = instructions[j].instruction;
                if (instructions[j].with) text += " with the "+instructions[j].with;
                $("#instruct"+obj.bell).text(text);
              }
            }
            
          }
        }
        
        //actually pull the rope
        t ? document.getElementById(id).beginElementAt(t-audioCtx.currentTime) : document.getElementById(id).beginElement();

        bell.stroke = obj.stroke * -1;
        
        let row = rowArr[rownum];
        if (row && !robotbells.includes(obj.bell)) { //&& row[place][0] === bell.num
          let i = row.row.findIndex(a => a[0] === obj.bell);
          if (!row.row[i][1] && ((rownum%2 === 0 && obj.stroke === 1) || (rownum%2 === 1 && obj.stroke === -1))) {
            row.row[i][1] = true;
          } else if (rowArr[rownum+1] && ((rownum%2 === 0 && obj.stroke === -1) || (rownum%2 === 1 && obj.stroke === 1))) {
            let j = rowArr[rownum+1].row.findIndex(a => a[0] === obj.bell);
            if (j > -1 && !rowArr[rownum+1].row[j][1]) rowArr[rownum+1].row[j][1] = true;
          }
          
        }
      }
      
      if (waiting) {
        waiting = false;
        nextBellTime = Math.max(audioCtx.currentTime, nextBellTime);
        scheduler();
      }
      
    } else if (phone && obj.bell === phonebell) {
      phonestroke *= -1;
    }
  }
  
  //given animation event find the buffer to play
  function ring(e) {
    //console.log(this.id);
    let bellnum = Number(this.id.startsWith("hand") ? this.id.slice(6) : this.id.slice(7));
    let bell = bells.find(b => b.num === bellnum);
    if (bell) {
      let pan = [];
      if (view === "line") {
        let p = 1;
        let child = $("div.linechute:nth-child(1)");
        while (child.attr("id") != "chute"+bellnum && p <= $("#bells").children().length) {
          p++;
          child = $("div.linechute:nth-child("+p+")");
        }
        pan.push((-numbells-1+p)/(numbells-1)+0.5, 0)
        pan.push(1 - Math.abs(pan[0]));
      } else {
        let x = (Number(bell.left) - 270)/135;
        let z = Number(bell.z)/100;
        pan.push(x, 10, z);
      }
      let buffer = bell.buffer;
      playSample(audioCtx, buffer, pan);
    }
  }
  
  //play sound
  function playSample(audioContext, audioBuffer, pan) {
    //console.log("playSample called");
    //console.log(audioBuffer);
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    const panner = audioContext.createPanner();
    panner.panningModel = 'equalpower';
    panner.setPosition(...pan);
    sampleSource.connect(panner).connect(gainNode).connect(audioContext.destination);
    //sampleSource.connect(audioContext.destination);
    sampleSource.start();
    return sampleSource;
  }
  
  function endpull(e) {
    let bellnum = Number(this.id.slice(7));
    let bell = mbells.find(o => o.num === bellnum);
    if (bell) {
      bell.ringing = false;
    }
  }
  
  function chainring(e) {
    let id = this.id;
    let num = Number(this.id.slice(7));
    let o = {bell: num, stroke: id.startsWith("hand") ? -1 : 1, ringer: name, time: audioCtx.currentTime};
    //console.log("emitting ring from chain "+audioCtx.currentTime);
    emitted.push(o);
    socket.emit("ring", o);
    document.getElementById(id).removeEventListener("endEvent", chainring);
    let bell = mbells.find(o => o.num === num);
    if (bell) bell.chained = false;
    console.log("unchained");
  }
  
  function thatisall() {
    playing = false;
    waiting = false;
    clearTimeout(timeout);
    $("#start").text("Start");
    $("#reset").removeClass("disabled");
    $("#simulator input").prop("disabled", false);
    $("div#method input,div.conduct input").prop("disabled", false);
    $("div.assign.active:hover > ul.dropdown").css("display", "block");
  }
  
  //taken from https://developer.apple.com/forums/thread/128376
  function requestDeviceMotion () {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {

        }
      })
      .catch(console.error);
    } else {
    // handle regular non iOS 13+ devices
    console.log ("not iOS");
    }
  }
  
  function highlight(n) {
    for (let i = 1; i <= numbells; i++) {
      $("#chute"+i).css("opacity", i === n ? 1 : 0.4);
    }
  }
  
  function fadeout(arr) {
    for (let i = 1; i <= numbells; i++) {
      $("#chute"+i).css("opacity", arr.includes(i) ? 0.4 : 1);
    }
  }
  
  function nextPlace() {
    nextBellTime += delay;
    //console.log("adding delay "+place);
    place++;
    if (place === numbells-1) {
      //console.log("penultimate");
      socket.emit("penultimate", rownum);
    }
    if (place === 1) {
      if (currentcall) {
        callqueue.push({call: currentcall, time: nextBellTime, rownum: rownum});
      }
    }
    if (place === numbells) {
      //console.log("rownum "+rownum);
      
      if (stroke === -1) nextBellTime += delay + .23*duration; //add handstroke gap
      if (stroke === 1) nextBellTime -= .23*duration;
      place = 0;
      stroke *= -1;
      rownum++;
      currentcall = rowArr[rownum] && rowArr[rownum].call ? rowArr[rownum].call : " ";
      
      if (rownum === rowArr.length-2) {
        roundscount++;
        if ((roundscount === robotopts.nthrounds && robotopts.stopatrounds) || comp) {
          thatsall = true;
          if (currentcall === " ") currentcall = "That's all!";
        }
      }
      
      if (rownum === rowArr.length && !thatsall) {
        //repeating
        //console.log("no next row");
        rownum = robotopts.roundsrows;
        rowArr.forEach(o => {
          o.row.forEach(a => {
            a[1] = false;
          });
        });
      } else if (rownum === rowArr.length && thatsall) {
        thatisall();
      }
      
    }
    
  }
  
  function scheduleRing(p, t) {
    if (p > -1) {
      let num = rowArr[rownum].row[p];
      let bell = num && num.length ? robotbells.includes(num[0]) || ringalso.includes(num[0]) : null;
      
      if (bell) {
        //console.log("scheduling "+num[0] + " time "+t);
        //soundqueue.push({bell: num[0], stroke: stroke, time: t, place: p});
        //console.log("soundqueue "+soundqueue.length);
        pull({bell: num[0], stroke: stroke}, t);
        if (!mybells.includes(num[0]) || !emittime) socket.emit("changestroke", {bell: num[0], stroke: stroke, place: p});
      }
      if (rownum === 0 && p === 0) {
        callqueue.push({call: "", time: t, rownum: rownum});
        //socket.emit("call", "");
      }
      if (rownum === robotopts.roundsrows-2 && p === 1 && firstcall) {
        callqueue.push({call: firstcall, time: t, rownum: rownum});
      }
      
      if (!bell && waitgaps && (!num || !num[1])) {
        //console.log("pull expected at "+t);

        waiting = t;
        //checkdelay = true; //if (!mybells.includes(num[0])) 
      } else {
        nextPlace();
      }
      

      
    } else {
      let call = p === -2 ? "Look to" : "Treble's going";
      callqueue.push({call: call, time: t, rownum: rownum});
      //socket.emit("call", call);
      nextPlace();
    }
    
    
  }
  
  function scheduler() {
    
    while (nextBellTime < audioCtx.currentTime + schedule && rowArr[rownum] && !waiting) {
      scheduleRing(place, nextBellTime);
    }
    !waiting && rowArr[rownum] ? timeout = setTimeout(scheduler, lookahead): clearTimeout(timeout);
    
  }
  
  function movehighlight(p) {
    let move = lastplayed;
    let call = lastcall;
    let callrow = lastcallrow;
    let last;
    let currentTime = audioCtx.currentTime;
    
    while (soundqueue.length && soundqueue[0].time < currentTime) {
      move = soundqueue[0].place + rownum*numbells + 1;
      last = soundqueue.shift();
    }
    while (callqueue.length && callqueue[0].time < currentTime) {
      call = callqueue[0].call;
      callrow = callqueue[0].rownum;
      callqueue.shift();
    }
    if (move != lastplayed) {
      //console.log(currentTime - last.time);
      //pull(last);
      lastplayed = move;
    }
    if (call != lastcall || callrow != lastcallrow) {
      $("#callcontainer").text(call);
      lastcall = call;
      lastcallrow = callrow;
    }
    if (emittime && currentTime-emittime > 0.2) {
      
    }
    if (rowArr[rownum] && place > -1 && rowArr[rownum].row.length > place) {
      let bell = rowArr[rownum].row[place][0];
      if (bell && checkdelay === true && typeof waiting === "number" && currentTime-waiting > 1 && !ringalso.includes(bell)) { //|| (ringalso.includes(bell) && currentTime-waiting >= 0)
        //console.log("someone is slow "+rownum);
        checkdelay = false;
        if (rownum > 0) {
          ringalso.push(bell);
          console.log(ringalso);
        }
        
        pull({bell: bell, stroke: stroke});
        if (!emittime) socket.emit("changestroke", {bell: bell, stroke: stroke, place: place});
        //emittime = currentTime;
        //socket.emit("ring", {bell: bell, stroke: stroke});
      }
      
    }
    
    requestAnimationFrame(movehighlight);
    
  }
  
  function updaterobot(obj) {
    robotopts = obj;
    for (let key in robotopts) {
      if (key === "stopatrounds") {
        $("#stopatrounds").prop("checked", robotopts[key]);
      } else if (key === "waitforgaps") {
        $("#waitforgaps").prop("checked", robotopts[key]);
        waitgaps = robotopts[key];
      } else {
        $("#"+key).val(robotopts[key]);
      }
    }
    calcspeed(robotopts.hours, robotopts.minutes);
  }
  
  function sallycolor(e) {
    solidme = $("#solidme").prop("checked");
    solidtreble = $("#solidtreble").prop("checked");
    $("#sally1").attr("fill", solidtreble ? "red" : "url(#sallypattern)");
    mybells.forEach(b => {
      $("#sally"+b).attr("fill", solidme ? "darkred" : "url(#sallypattern)");
    });
    
  }
  
  
  function addrope(bell) {
    
    let rope = 
        view === "line" ? 
        `<div id="chute${bell.num}" class="linechute"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="rope${bell.num}" class="rope" width="${width}" height="500" viewBox="0 ${bell.stroke === 1 ? "0" : "173.7"} ${width} 500" >` : 
    `<div class="chute" id="chute${bell.num}">
    <span class="bellnum">${bell.num}</span>
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="rope${bell.num}" class="rope" width="60" height="500" viewBox="0 ${bell.stroke === 1 ? "0" : "173.7"} 60 500" >`;
    
    rope += `
          <defs>
            <pattern id="sallypattern" x="0" y="0" width="1" height="0.13" >
              <path stroke="blue" stroke-width="3.2" d="M-2,4 l5,-5" />
              <path stroke="red" stroke-width="3.2" d="M-2,8 l9,-9" />
              <path stroke="skyblue" stroke-width="3.2" d="M-2,12 l12,-12" />
              <path stroke="blue" stroke-width="3.2" d="M1,13 l9,-9" />
              <path stroke="red" stroke-width="3.2" d="M5,13 l5,-5" />
            </pattern>
          </defs>
          
          <rect x="30" y="-90" width="3" height="260" fill="#ddd" stroke-width="1" stroke="#aaa" />
          <rect x="30" y="255" width="3" height="60" fill="#ddd" stroke-width="1" stroke="#aaa" />
          
          <svg id="hand${bell.num}" class="hand">
            <rect x="0" y="170" width="29" height="90" fill="transparent"/>
            <rect x="35" y="170" width="29" height="90" fill="transparent"/>
            <rect id="sally${bell.num}" class="sally" x="27" y="170" width="9" height="90" rx="7" fill="url(#sallypattern)" />
          </svg>
          
          <svg id="back${bell.num}" class="back">
            <rect x="0" y="315" width="29" height="61" fill="transparent"/>
            <rect x="33" y="315" width="29" height="61" fill="transparent"/>
            <svg id="tail${bell.num}" class="tail">
              <rect x="30" y="315" width="5" height="61" fill="white"/>
              <path stroke="#ddd" stroke-width="3" d="M31.5,310
                                                      v30
                                                      l2,2
                                                      v30
                                                      l-1,2
                                                      h-2
                                                      l-1,-2
                                                      v-28
                                                      l4,-5
                                                      v-20
                                                      l-6,-3" fill="none" />
              <path stroke="#aaa" stroke-width="1" d="M30,290 v50
                                                      l2,2
                                                      v30
                                                      l-1,2
                                                      l-1,-2
                                                      v-28
                                                      l5,-5
                                                      v-20
                                                      l-6,-3" fill="none" />
              <path stroke="#aaa" stroke-width="1" d="M33,290 v50
                                                      l2,2
                                                      v30
                                                      l-2,3
                                                      h-4
                                                      l-2,-2
                                                      v-28
                                                      l6,-7
                                                      v-17
                                                      l-6,-3
                                                      l1.2,-2" fill="none" />
              <rect x="30.5" y="315" width="2" height="9" fill="#ddd" />
              <path stroke="#ddd" fill="none" stroke-width="1" d="M31,342 l3,-3" />
            </svg>
          </svg>
          
          <!--restart="whenNotActive"-->
        `;
    let yy = [0, -6.2, -17, -37.22, -55.2, -37.11, -9.74, 23, 56.35, 89.125, 116.15, 135.04, 149.42, 159.65, 170.1, 173.7];
    ["hand", "back"].forEach(s => {
      for (let i = 0; i < yy.length-1; i++) {
        let j = s === "hand" ? i+1 : i;
        let y = s === "hand" ? yy[j] : yy[yy.length-i-2] ;
        let dur = setdur(s,i);
        let begin = i === 0 ? "indefinite" : s + (j-1) +"b"+bell.num + ".endEvent";
        let anim = `<animate id="${s+j+"b"+bell.num}" attributename="viewBox" to="0 ${y} ${width} 500" dur="${dur}s" begin="${begin}" fill="freeze"></animate>
        `;
        rope += anim;
      }
      
    });
    rope += "</svg></div>";
      
    
    
    
    $("#bells").append(rope);
  }
  
  function setdur(s,i) {
    let n = duration/21;
    let dur = [0,14].includes(i) ? 3*n : [1,13].includes(i) ? 2*n : n;
    return dur;
  }
  
  const placeNames = [{num: 1, name: "lead"}, {num: 2, name: "2nds"}, {num: 3, name: "3rds"}];
  function describe(rowArray, bell, stage) {
    instructions = [];
    var places = '1234567890ET';
    let i = 1;
    let work = [];
    
    while (i < rowArray.length-2) {
      let s = getPlace(i);
      let t = getPlace(i+1);
      let u = getPlace(i+2);
      
      if (t == s && u == s) { 
        let count = 3;
        while (checkPlace(i+count, s)) {
          count++;
        }
        work.push(count + " blows in " + placeName(s));
        instructions[i] = {instruction: count + " blows in " + placeName(s)};
        i += count-1;
      } else if (t == s) {
        //console.log("Make place");
        work.push(makePlace(s, i));
        instructions[i] = {instruction: makePlace(s, i)};
        i++;
      } else if (t-s === u-t) {
        //console.log("Hunt");
        let dir = t-s;
        let dirName = dirname(dir);
        let treble = huntbells[0] && getBell(i,s+dir) === huntbells[0] ? ", pass "+huntbells[0]+" in "+s+"–"+t : "";
        instructions[i] = {instruction: "Hunt " + dirName};
        let place = u;
        while (getPlace(i+3)-place === dir) {
          i++;
          place+=dir;
        }
        work.push("Hunt " + dirName);
        i++;
        //console.log("i is now "+i);
      } else if (t == u) {
        //console.log("also make place");

        let last = work.length > 0 ? work[work.length-1] : "";
        let x = last.indexOf("Point") == -1 || last.indexOf("Fish") == -1 ? i : i+1;
        let v = rowArray[i+3] ? getPlace(i+3) : null;
        if (v != u) {
          work.push(makePlace(t, i+1));
          instructions[x] = {instruction: makePlace(t, i+1)};
          i+=1;
        } else {
          let count = 3;
          while (checkPlace(i+count+1, t)) {
            count++;
          }
          work.push(count + " blows in " + placeName(t));
          instructions[x] = {instruction: count + " blows in " + placeName(t)};
          i += count;
        }
      } else {
        //point, fishtail, or dodge
        let dir1 = t-s;
        let v = rowArray[i+3] ? getPlace(i+3) : null;

        if (v == u || v-u != dir1) {
          let stroke = (i+1) % 2 === 0 ? " at hand" : " at back";
          work.push("Point " + placeName(t));
          instructions[i] = {instruction: "Point " + placeName(t) + stroke};
          instructions[i].with = getBell(i+1,s);
          i+=1;
        } else {
        let count = 1;
          let starti = i;
          i+=3;
          while (getPlace(i) == t && getPlace(i+1) == s) {
            count++;
            i+=2;
          }
          if (getPlace(i) == s || getPlace(i) == s+dir1*-1) {
            let points = count > 2 ? ", " + count + " points " + placeName(t) : "";
            let places = s > t ? t + "-" + s : s + "-" + t;
            work.push("Fishtail " + places + points);
            instructions[starti] = {instruction: "Fishtail " + places + points};
            instructions[starti].with = getBell(starti+1,s);
            //if (getPlace(i) == s) 
            i-=2;
          } else if (getPlace(i+1) == t || getPlace(i+1) == t+dir1 || getPlace(i+1) == null) {
            let places = s > t ? t + "-" + s : s + "-" + t;
            work.push(dodgeNum(count) + places + " " + dirname(dir1));
            instructions[starti] = {instruction: dodgeNum(count) + places + " " + dirname(dir1)};
            instructions[starti].with = getBell(starti+1,s);
            i--;
          }

        }

      }
    }
    
    let penult = getPlace(rowArray.length-2);
    let ult = getPlace(rowArray.length-1);

    if (i === rowArray.length-2) {
      let dir = ult-penult;
      if (dir != 0) {
        work.push("Hunt " + dirname(dir));
        instructions[rowArray.length-2] = {instruction: "Hunt " + dirname(dir)};
      } else if (ult == penult) {
        work.push(makePlace(ult));
        instructions[rowArray.length-2] = {instruction: makePlace(ult)};
      }
    }
    
    function getPlace(j) {
      return rowArray[j] ? rowArray[j].row.indexOf(bell)+1 : null;
    }
    
    function getBell(row, place) {
      return rowArray[row].row[place-1];
    }

    function checkPlace(row, value) {
      return getPlace(row) === value;
    }
    
    function makePlace(num, rownum) {
      if (num == 1 && rownum % 2 == 1) return "Lead wrong";
      else if (num == 1 ) return "Lead full";
      else if (num == stage) return "Lie behind";
      else return "Make " + placeName(num);
    }
    
    function dodgeNum(num) {
      if (num == 1) return "Dodge ";
      else if (num == 2) return "Double dodge ";
      else return num + " dodges ";
    }

    function dirname(dir) {
      let val = dir == 1 ? "up" : "down";
      return val;
    }
    
    function placeName(num) {
      //console.log("num to place " + num);
      if (0 < num && num < 4) {
        return placeNames[num-1].name;
      } else {
        return num + "ths";
      }
    }

    
    
  }
  
  
  
  
});



