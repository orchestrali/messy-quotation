// client-side js, loaded by index.html
// run by the browser each time the page is loaded

$(function() {
  console.log("hello world :o");
  
  const socket = window.io();
  const soundurl = "https://cdn.glitch.com/73aed9e9-7ed2-40e5-93da-eb7538e8d42c%2F";
  const stages = ["minimus", "minor", "major", "royal", "maximus"];
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let name;
  let list = [];
  let entrants = [];
  let captain = false;
  let door = false;
  let numbells;
  let sounds = "tower";
  let display = "animate";
  let trebleloc = "right";
  let bells;
  let mybells = [];
  let mbells = [];
  let sallies = [];
  let hand;
  let tails = [];
  let back;
  
  $("#enterbutton").on("click", enter);
  $("input#secret").on("keyup", (e) => {
    if (e.code === "Enter") {
      enter(e);
    }
  });
  
  //assign a bell
  $("#entrants").on("change", "div.assign", function() {
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
  
  //enter press in chat input
  $("input#chat").on("keyup", function(e) {
    if (e.code === "Enter" && $("input#chat").val().length) {
      socket.emit("chat", {name: name, message: $("input#chat").val()});
      $("input#chat").val("");
    }
  });
  
  //prevent typing in inputs from triggering a bell ring
  $("body").on("keyup", "input", function(e) {
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
  $("body").on("keyup", function(e) {
    if (door && mybells.length) {
      let bell = mbells.find(o => o.keys.includes(e.key));
      if (bell && !bell.ringing) {
        let stroke = bells.find(b => b.num === bell.num).stroke;
        socket.emit("ring", {bell: bell.name, stroke: stroke});
      }
    }
  });
  
  $("#numbells li").on("click", function(e) {
    if (captain) {
      let n = Number($(this).text());
      socket.emit("stage", n);
    }
  });
  
  //get list of names currently in use
  socket.on("names", (nn) => {
    list = nn;
  });
  
  //get bells
  socket.on("bells", arr => {
    bells = arr;
    setupSample(0);
  });
  
  //get current number of bells
  socket.on("numbells", stagechange);
  
  
  //secret was wrong
  socket.on('wrong', () => {
    $("#secret").val("");
    $("#secret").attr("placeholder", "invalid secret");
  });
  
  //this socket enters
  socket.on("open", (obj) => {
    door = true;
    entrants = obj.entrants;
    if (entrants.find(o => o.name === name).conductor) {
      captain = true;
    }
    updatelist(entrants);
     
    
    $("#enter").hide();
    $("#container").show();
  });
  
  //
  socket.on("entrance", (m) => {
    if (door) {
      entrants = m.info;
      updatelist(entrants);
    }
    
  });
  
  socket.on("disconnect", (r) => {
    console.log(r);
    //if (r === 'io server disconnect') {
      door = false;
      captain = false;
      $("#container").hide();
      $("#enter").hide();
      $("#closed").show();
    //}
    
  });
  
  
  socket.on("stagechange", stagechange);
  
  
  socket.on("assignment", (obj) => {
    
    assign(obj);
    updatelist(obj);
    entrants = obj;
  });
  
  
  socket.on("ring", obj => {
    if (door) {
      let id = (obj.stroke === 1 ? "hand1" : "back1") + obj.bell;
      let mbell = mbells.find(b => b.name === obj.bell);
      if (mbell) {
        mbell.ringing = true;
      }
      document.getElementById(id).beginElement();
      let bell = bells.find(b => b.bell === obj.bell && b.type === sounds);
      bell.stroke = obj.stroke * -1;
    }
  });
  
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
    
    name = $("#name").val();
    let secret = $("#secret").val();
    if (name.length && !/^\s+$/.test(name) && secret.length && !/^[^\w]+$/.test(secret) && !list.includes(name)) {
      socket.emit("entrant", {name: name, secret: secret});

    } else if (list.includes(name)) {
      $("#name").val("");
      $("#name").attr("placeholder", '"'+name+'" already in use; pick another name');
    } else {
      $("#name").val("");
      $("#secret").val("");
      $("#name").attr("placeholder", "invalid name or wrong secret");
    }
    
  }
  
  function remove(e) {
    e.removeEventListener("click", emitring);
    e.removeEventListener("mouseenter", pointer);
  }
  
  function pointer(e) {
    let bell = bells.find(b => b.bell === this.id.slice(-2) && b.num);
    if ((this.id.startsWith("sally") && bell.stroke === 1) || (this.id.startsWith("tail") && bell.stroke === -1)) {
      this.style.cursor = "pointer";
    } else {
      this.style.cursor = "auto";
    }
  }
  
  //emit ring from a click
  function emitring(e) {
    
    let bell = bells.find(b => b.bell === this.id.slice(-2) && b.num);
    if (this.id.startsWith("sally") && bell.stroke === 1) {
      socket.emit("ring", {bell: bell.bell, stroke: 1});
    } else if (this.id.startsWith("tail") && bell.stroke === -1) {
      socket.emit("ring", {bell: bell.bell, stroke: -1});
    }
  }
  
  
  function updatelist(m) {
    $("#entrants li").remove();
    m.forEach((e) => {
      if (e.name === name && e.conductor) {
        captain = true;
        $("#numbells li:hover").css("cursor", "pointer");
      }
      let c = e.conductor ? " (C)" : "";
      let d = captain || e.name === name ? ' active"' : '"';
      let b = e.bells.length ? e.bells.join(",") : "no bells";
      $("#entrants").append('<li><span>'+e.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">'+b+'</span>' + selectOpts(name, e.bells) +'</div></li>');
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
  
  function stagechange(n) {
    if (n !== numbells) {
      numbells = n;
      mbells.forEach(b => {
        document.getElementById("hand15"+b.name).removeEventListener("endEvent", endpull);
        document.getElementById("back14"+b.name).removeEventListener("endEvent", endpull);
      });
      $("#display div").remove();
      $("#bells svg").remove();
      let current = bells.filter(b => b.type === sounds);
      bells.forEach(b => delete b.num);
      for (let i = 0; i < numbells; i++) {
        let j = trebleloc === "right" ? i : numbells-1-i;
        let num = trebleloc === "right" ? numbells-i : i+1;
        addrope(current[j]);
        bellnums(num);
        current[j].num = num;
        current[j].stroke = 1;
        let handstroke = document.getElementById("hand11"+current[j].bell);
        handstroke.removeEventListener("beginEvent", ring);
        handstroke.addEventListener("beginEvent", ring);
        let backstroke = document.getElementById("back13"+current[j].bell);
        backstroke.removeEventListener("beginEvent", ring);
        backstroke.addEventListener("beginEvent", ring);
      }
      
      $("#numbells li").css({color: "black", "background-color": "white"});
      let stage = stages[(numbells-4)/2];
      $("li#"+stage).css({color: "white", "background-color": "black"});
      
      for (let i = 0; i < entrants.length; i++) {
        entrants[i].bells = entrants[i].bells.filter(b => b <= numbells);
      }
      updatelist(entrants);
      assign(entrants);
    }
  }
  
  function bellnums(n) {
    let elem = `<div class="bellnum">${n}</div>`;
    $("#display").append(elem);
  }
  
  
  function assign(obj) {
    let me = obj.find(r => r.name === name);
    if (me && me.bells) {
      mybells = me.bells;
      mbells = [];
      sallies.forEach(remove);
      tails.forEach(remove);
      $("#keyboard ul > li").detach();
      if (mybells.length > 0) {
        $("#keyboard ul").append("<li>Press ANY of the keys to ring the corresponding bell</li>");
        mybells.forEach((mb, i) => {
          let bell = bells.find(b => b.num === mb);
          let keys = (mb < 10 ? mb : mb === 10 ? "0" : mb === 11 ? "-" : "=")+(i===0 ? "j" : i===1 ? "f" : "");
          mbells.push({num: mb, name: bell.bell, keys: keys});
          sallies.push(document.getElementById("sally"+bell.bell));
          tails.push(document.getElementById("tail"+bell.bell));
          document.getElementById("hand15"+bell.bell).addEventListener("endEvent", endpull);
          document.getElementById("back14"+bell.bell).addEventListener("endEvent", endpull);
          let li = `<li><label for="bell${mb}">bell ${mb}:</label><input type="text" id="bell${mb}" value="${keys}" class="keyboard" /></li>`;
          $("#keyboard ul").append(li);
        });
        
        sallies.forEach(s => {
          s.addEventListener("mouseenter", pointer);
          s.addEventListener("click", emitring);
        });
        
        tails.forEach(t => {
          t.addEventListener("mouseenter", pointer);
          t.addEventListener("click", emitring);
        });
        
        
      }
    }
  }
  
  async function getFile(audioContext, filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }
  
  async function setupSample(i) {
    let arrayBuffer = await getFile(audioCtx, soundurl + bells[i].url);
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
  
  function ring(e) {
    //console.log(this.id);
    let bellname = this.id.slice(-2);
    let bell = bells.find(b => b.bell === bellname && b.type === sounds);
    if (bell) {
      let buffer = bell.buffer;
      playSample(audioCtx, buffer);
    }
  }
  
  function playSample(audioContext, audioBuffer) {
    //console.log("playSample called");
    //console.log(audioBuffer);
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(audioContext.destination)
    //sampleSource.connect(audioContext.destination);
    sampleSource.start();
    return sampleSource;
  }
  
  function endpull(e) {
    let bellname = this.id.slice(-2);
    let bell = mbells.find(o => o.name === bellname);
    if (bell) {
      bell.ringing = false;
    }
  }
  
  function addrope(bell) {
    let rope = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="${bell.bell}" class="rope" width="150" height="500" viewBox="0 0 150 500" >
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
          
          <svg id="hand${bell.bell}" class="hand">
            <rect x="0" y="170" width="29" height="90" fill="white"/>
            <rect x="35" y="170" width="29" height="90" fill="white"/>
            <rect id="sally${bell.bell}" class="sally" x="27" y="170" width="9" height="90" rx="7" fill="url(#sallypattern)" />
          </svg>
          
          <svg id="back${bell.bell}" class="back">
            <rect x="0" y="315" width="29" height="61" fill="white"/>
            <rect x="33" y="315" width="29" height="61" fill="white"/>
            <svg id="tail${bell.bell}" class="tail">
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
          
          <animate id="hand1${bell.bell}" attributename="viewBox" to="0 -40 150 500" dur="0.3s" begin="indefinite" fill="freeze" restart="whenNotActive"></animate>
          <animate id="hand2${bell.bell}" attributename="viewBox" from="0 -40 150 500" to="0 -80 150 500" dur="0.4s" begin="hand1${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand3${bell.bell}" attributename="viewBox" from="0 -80 150 500" to="0 -76.3 150 500" dur="0.1s" begin="hand2${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand4${bell.bell}" attributename="viewBox" to="0 -65.4 150 500" dur="0.1s" begin="hand3${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand5${bell.bell}" attributename="viewBox" to="0 -48 150 500" dur="0.1s" begin="hand4${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand6${bell.bell}" attributename="viewBox" to="0 -25 150 500" dur="0.1s" begin="hand5${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand7${bell.bell}" attributename="viewBox" to="0 1.9 150 500" dur="0.1s" begin="hand6${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand8${bell.bell}" attributename="viewBox" to="0 31.6 150 500" dur="0.1s" begin="hand7${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand9${bell.bell}" attributename="viewBox" to="0 62.2 150 500" dur="0.1s" begin="hand8${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand10${bell.bell}" attributename="viewBox" to="0 91.9 150 500" dur="0.1s" begin="hand9${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand11${bell.bell}" attributename="viewBox" to="0 119 150 500" dur="0.1s" begin="hand10${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand12${bell.bell}" attributename="viewBox" to="0 141.9 150 500" dur="0.1s" begin="hand11${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand13${bell.bell}" attributename="viewBox" to="0 159.3 150 500" dur="0.1s" begin="hand12${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand14${bell.bell}" attributename="viewBox" to="0 170.1 150 500" dur="0.1s" begin="hand13${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="hand15${bell.bell}" attributename="viewBox" to="0 173.7 150 500" dur="0.1s" begin="hand14${bell.bell}.endEvent" fill="freeze"></animate>
          
          <animate id="back14${bell.bell}" attributename="viewBox" to="0 0 150 500" dur="0.3s" begin="back13${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back13${bell.bell}" attributename="viewBox" to="0 -40 150 500" dur="0.2s" begin="back12${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back12${bell.bell}" attributename="viewBox" to="0 -80 150 500" dur="0.3s" begin="back11${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back11${bell.bell}" attributename="viewBox" to="0 -76.3 150 500" dur="0.1s" begin="back10${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back10${bell.bell}" attributename="viewBox" to="0 -65.4 150 500" dur="0.1s" begin="back9${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back9${bell.bell}" attributename="viewBox" to="0 -48 150 500" dur="0.1s" begin="back8${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back8${bell.bell}" attributename="viewBox" to="0 -25 150 500" dur="0.1s" begin="back7${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back7${bell.bell}" attributename="viewBox" to="0 1.9 150 500" dur="0.1s" begin="back6${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back6${bell.bell}" attributename="viewBox" to="0 31.6 150 500" dur="0.1s" begin="back5${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back5${bell.bell}" attributename="viewBox" to="0 62.2 150 500" dur="0.1s" begin="back4${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back4${bell.bell}" attributename="viewBox" to="0 91.9 150 500" dur="0.1s" begin="back3${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back3${bell.bell}" attributename="viewBox" to="0 119 150 500" dur="0.1s" begin="back2${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back2${bell.bell}" attributename="viewBox" to="0 141.9 150 500" dur="0.2s" begin="back1${bell.bell}.endEvent" fill="freeze"></animate>
          <animate id="back1${bell.bell}" attributename="viewBox" to="0 159.3 150 500" dur="0.1s" begin="indefinite" fill="freeze"></animate>
        </svg>`
    
    $("#bells").append(rope);
  }
  
  
});



