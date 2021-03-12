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
  const stages = ["minimus", "minor", "major", "royal", "maximus"];
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  
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
  let speed = 1.3;
  let latency = 0;
  let phone = false;
  let phoneid;
  let phoneids = [];
  let phonebell;
  let phonestroke = 1;
  let p = 1;
  let centerself = false;
  let width = $("#spacing option:checked").val();
  
  
  $("#container").on("click", 'input[type="text"],input[type="number"]', () => {
    $("#resume").show();
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
        socket.emit("ring", {bell: bell.num, stroke: stroke});
      }
    }
  });
  
  //click stand button
  $("#stand").on("click", function(e) {
    socket.emit("stand");
  });
  
  $("#volume").on("change", function(e) {
    gainNode.gain.value = this.value;
  });
  
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
  
  $("#numbells li").on("click", function(e) {
    if (captain) {
      let n = Number($(this).text());
      socket.emit("stage", n);
    }
  });
  
  $('input[name="trebleloc"]').on("change", function(e) {
    trebleloc = $('input[name="trebleloc"]:checked').val();
    rearrange(true);
  });
  
  $('input[name="centerself"]').on("change", function() {
    if ($(this).is(":checked")) {
      centerself = true;
    } else {
      centerself = false;
    }
    rearrange(false);
  });
  
  //change speed
  $("#speed").change(function() {
    speed = Number($("#speed").val());
    socket.emit("speed", Number($("#speed").val()));
  });
  
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
  
  //get list of names currently in use
  socket.on("names", (nn) => {
    list = nn;
  });
  
  //get bells
  socket.on("bells", arr => {
    bells = arr.map(b => {
      b.url = b.type === "tower" ? bellurl + b.url : soundurl + b.url;
      return b;
    });
    setupSample(0);
  });
  
  //get current number of bells
  socket.on("numbells", stagechange);
  
  socket.on("speed", n => {
    if (door && !phone) {
      speed = n;
      for (let n = 0; n < numbells; n++) {
        
        for (let i = 0; i < 15; i++) {
          ["hand","back"].forEach(s => {
            let j = s === "hand" ? i+1 : i;
            document.getElementById(s+j+"b"+n).setAttributeNS(null, "dur", setdur(s,i)+"s");
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
  
  socket.on("duplicate", () => {
    $("#name").val("");
    $("#name").attr("placeholder", '"'+name+'" already in use; pick another name');
  });
  
  
  //secret was wrong
  socket.on('wrong', () => {
    $("#secret").val("");
    $("#secret").attr("placeholder", "invalid secret");
  });
  
  //this socket enters
  socket.on("open", (obj) => {
    door = true;
    entrants = obj.entrants;
    numbells = obj.state.numbells;
    speed = obj.state.speed;
    stagechange(obj.state);
    if (entrants.find(o => o.name === name).conductor) {
      captain = true;
      $(".conduct").show();
    }
    updatelist(entrants);
     
    
    $("#enter").hide();
    $("#resume").hide();
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
      socket.emit("ring", {bell: obj.bellnum, stroke: phonestroke});
    }
  });
  
  //someone else enters
  socket.on("entrance", (m) => {
    if (door) {
      updateentrant(m.info, true);
    }
    
  });
  
  socket.on("exit", (m) => {
    if (door) {
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
  
  socket.on("disconnect", (r) => {
    console.log(r);
    //if (r === 'io server disconnect') {
      door = false;
      captain = false;
      $("#container").hide();
      $("#enter").hide();
      $("#phoneinfo").hide();
      $("#closed").show();
    //}
    
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
  
  
  socket.on("stagechange", stagechange);
  
  
  //any socket is assigned
  socket.on("assignment", (obj) => {
    //console.log(bells);
    
    updateentrant(obj);
    if (obj.name === name) {
      assign(obj);
      if (centerself) { 
        rearrange(false);
      }
    }
  });
  
  //stand command received
  socket.on("stand", (n) => {
    if (door) {
      for (let i = 1; i <= numbells; i++) {
        let bell = bells.find(b => b.num === i);
        if (bell.stroke !== 1) {
          let id = "back0b" + i;
          let mbell = mbells.find(b => b.num === i);
          if (mbell) mbell.ringing = true;
          document.getElementById(id).beginElement();
          bell.stroke = 1;
        }
      }
      //console.log(bells.filter(b => b.num).map(b => {return {num: b.num, stroke: b.stroke}}));
    }
  });
  
  
  socket.on("ring", obj => {
    if (door && !phone) {
      //console.log(obj);
      let id = (obj.stroke === 1 ? "hand1b" : "back0b") + obj.bell;
      let bell = bells.find(b => b.num === obj.bell);
      if (bell.stroke === obj.stroke) {
        let mbell = mbells.find(b => b.num === obj.bell);
        if (mbell) {
          mbell.ringing = true;
        }
        document.getElementById(id).beginElement();

        bell.stroke = obj.stroke * -1;
      }
      
    } else if (door && phone && obj.bell === phonebell) {
      phonestroke *= -1;
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
    requestDeviceMotion();
    name = $("#name").val();
    let secret = $("#secret").val();
    if (name.length && !/^\s+$/.test(name) && secret.length && !/^[^\w]+$/.test(secret)) {
      socket.emit("entrant", {name: name, secret: secret});

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
    let num = this.id.startsWith("sally") ? Number(this.id.slice(5)) : Number(this.id.slice(4));
    let bell = bells.find(b => b.num === num);
    if (this.id.startsWith("sally") && bell.stroke === 1) {
      socket.emit("ring", {bell: bell.num, stroke: 1});
    } else if (this.id.startsWith("tail") && bell.stroke === -1) {
      socket.emit("ring", {bell: bell.num, stroke: -1});
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
  
  function updateentrant(o, isnew) {
    if (isnew) {
      entrants.push(o);
      let c = o.conductor ? " (C)" : "";
      let d = captain || o.name === name ? ' active"' : '"';
      $("#entrants").append('<li id="'+o.name+'"><span>'+o.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">no bells</span>' + selectOpts(name, o.bells) +'</div></li>');
      
    } else {
      let li = $("li#"+o.name);
      let j = entrants.findIndex(e => e.name === o.name);
      if (o.exit) {
        li.remove();
        entrants.splice(j, 1);
      } else {
        let text = o.bells.length ? o.bells.join(",") : "no bells";
        li.find("span.summary").text(text);
        for (let i = 1; i <= numbells; i++) {
          $("input#"+o.name+"-"+i).prop("checked", o.bells.includes(i));
        }
        entrants[j].bells = o.bells;
      }
    
    }
  }
  
  function rearrange(rev) {
    let svgs = [];
    let nums = [];
    for (let i = numbells; i > 0; i--) {
      svgs.push($("#bells > svg:nth-child("+i+")").detach());
      nums.push($("#display .bellnum:nth-child("+i+")").detach());
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
      $("#display").append(n);
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
    //if (n !== numbells) {
      numbells = o.numbells;
      
      $("#display div").remove();
      $("#bells svg").remove();
      $(".phone option").remove();
      let current = bells.filter(b => b.type === sounds);
      bells.forEach(b => delete b.num);
      let centernum = centerself && mybells.length ? Math.min(...mybells) : numbells/2;
      let offset = (centernum + numbells/2)%numbells;
      for (let i = 0; i < numbells; i++) {
        let j = trebleloc === "right" ? (i+numbells-offset)%numbells : (2*numbells-1+offset-i)%numbells;
        let num = trebleloc === "right" ? (2*numbells-i+offset)%numbells : (i+1+numbells-offset)%numbells;
        if (num === 0) num = numbells;
        
        bellnums(num);
        current[j].num = num;
        current[j].stroke = o.bells.find(b => b.num === num).stroke;
        addrope(current[j]);
        let handstroke = document.getElementById("hand10b"+current[j].num);
        handstroke.removeEventListener("beginEvent", ring);
        handstroke.addEventListener("beginEvent", ring);
        let backstroke = document.getElementById("back13b"+current[j].num);
        backstroke.removeEventListener("beginEvent", ring);
        backstroke.addEventListener("beginEvent", ring);
      }
      $(".bellnum").css("width", width+"px");
      $("#numbells li").css({color: "black", "background-color": "white"});
      let stage = stages[(numbells-4)/2];
      $("li#"+stage).css({color: "white", "background-color": "black"});
      
      for (let i = 0; i < entrants.length; i++) {
        entrants[i].bells = entrants[i].bells.filter(b => b <= numbells);
        updateentrant(entrants[i]);
        if (entrants[i].name === name) {
          assign(entrants[i]);
        }
      }
      
    //}
  }
  
  //add a bell number above the rope
  function bellnums(n) {
    let elem = `<div class="bellnum">${n}</div>`;
    $("#display").append(elem);
  }
  
  //assign a bell to me
  function assign(me) {
    
    if (me && me.bells) {
      //console.log(me.bells);
      //remove stuff
      sallies.forEach(remove);
      tails.forEach(remove);
      mybells.forEach(b => {
        let i = mbells.findIndex(m => m.num === b);
        ["hand15b", "back14b"].forEach(id => {
          document.getElementById(id+mbells[i].num).removeEventListener("endEvent", endpull);
        });
        if (!me.bells.includes(b)) {
          $('.phone option[value="'+b+'"]').remove();
          $('label[for="bell'+b+'"]').parent("li").remove();
          mbells.splice(i, 1);
        }
      });
      mybells = mybells.filter(b => me.bells.includes(b));
      
      //add stuff
      me.bells.forEach(b => {
        let bell = bells.find(be => be.num === b);
        let keys = b < 10 ? b.toString() : b === 10 ? "0" : b === 11 ? "-" : "="; //+(i===0 ? "j" : i===1 ? "f" : "")
        sallies.push(document.getElementById("sally"+bell.num));
        tails.push(document.getElementById("tail"+bell.num));
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
      /*
      mbells = [];
      $(".phone option").remove();
      let options = '<option></option>';
      
      $("#keyboard ul > li").detach();
      if (mybells.length > 0) {
        $("#keyboard ul").append("<li>Press ANY of the keys to ring the corresponding bell</li>");
        mybells.forEach((mb, i) => {
          let bell = bells.find(b => b.num === mb);
          let keys = (mb < 10 ? mb : mb === 10 ? "0" : mb === 11 ? "-" : "=")+(i===0 ? "j" : i===1 ? "f" : "");
          mbells.push({num: mb, name: bell.bell, keys: keys});
          options += `<option value="${mb}">${mb}</option>`;
          sallies.push(document.getElementById("sally"+bell.bell));
          tails.push(document.getElementById("tail"+bell.bell));
          document.getElementById("hand15"+bell.bell).addEventListener("endEvent", endpull);
          document.getElementById("back14"+bell.bell).addEventListener("endEvent", endpull);
          let li = `<li><label for="bell${mb}">bell ${mb}:</label><input type="text" id="bell${mb}" value="${keys}" class="keyboard" /></li>`;
          $("#keyboard ul").append(li);
        });
        
        $(".phone select").append(options);
        
      } */
      sallies.forEach(s => {
          s.addEventListener("mouseenter", pointer);
          s.addEventListener("click", emitring);
        });
        
        tails.forEach(t => {
          t.addEventListener("mouseenter", pointer);
          t.addEventListener("click", emitring);
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
  
  //given animation event find the buffer to play
  function ring(e) {
    //console.log(this.id);
    let bellnum = Number(this.id.slice(7));
    let bell = bells.find(b => b.num === bellnum);
    if (bell) {
      let buffer = bell.buffer;
      playSample(audioCtx, buffer);
    }
  }
  
  //play sound
  function playSample(audioContext, audioBuffer) {
    //console.log("playSample called");
    //console.log(audioBuffer);
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(gainNode).connect(audioContext.destination);
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
  
  function addrope(bell) {
    let n = speed/19;
    let rope = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="rope${bell.num}" class="rope" width="${width}" height="500" viewBox="0 ${bell.stroke === 1 ? "0" : "173.7"} ${width} 500" >
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
            <rect x="0" y="170" width="29" height="90" fill="white"/>
            <rect x="35" y="170" width="29" height="90" fill="white"/>
            <rect id="sally${bell.num}" class="sally" x="27" y="170" width="9" height="90" rx="7" fill="url(#sallypattern)" />
          </svg>
          
          <svg id="back${bell.num}" class="back">
            <rect x="0" y="315" width="29" height="61" fill="white"/>
            <rect x="33" y="315" width="29" height="61" fill="white"/>
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
    let yy = [0, -40, -80, -76.3, -65.4, -48, -25, 1.9, 31.6, 62.2, 91.9, 119, 141.9, 159.3, 170.1, 173.7];
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
    rope += "</svg>";
      
      
    
    
    $("#bells").append(rope);
  }
  
  function setdur(s,i) {
    let n = speed/19;
    let dur = (s === "hand" && [0,1].includes(i)) || (s === "back" && i === 14) ? 3*n : s === "back" && [12,13].includes(i) ? 2*n : n;
    return dur;
  }
  
  
});



