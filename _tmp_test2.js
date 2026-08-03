function hashStr(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}
function daySeed(today,birthday,salt){return hashStr(today+"|"+salt+"|"+birthday);}
var LUCKY_COLORS=["粉","白","浅蓝","薄荷绿","鹅黄","薰衣草紫","珊瑚橙","奶杏色"];
var LUCKY_DIRS=["东","南","西","北","东南","西南","西北","东北"];
var YI_POOL=["祈福许愿","学习新知","整理收纳","主动沟通","运动拉伸","创作表达","规划复盘","社交联结","独处充电","理财记账","早睡养神","记录灵感","表白心意","开启新计划"];
var JI_POOL=["冲动决策","过度消费","熬夜损耗","内耗纠结","拖延回避","与人争执","暴饮暴食","言多必失","苛责自己"];
var TIPS=["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"];
var QUOTES=["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11"];
var MANIFEST=["m1","m2","m3","m4","m5","m6"];
var TAROT=[];for(var i=0;i<22;i++)TAROT.push("T"+i);
function pick(arr,seed){return arr[seed%arr.length];}
var birthday="2000-10-22";
["2026-08-03","2026-08-04","2026-08-05","2026-08-06","2026-08-07"].forEach(function(today){
  var score=60+(daySeed(today,birthday,"score")%40);
  console.log("=== "+today+" ===");
  console.log(" score:",score,
    "| color:",pick(LUCKY_COLORS,daySeed(today,birthday,"color")),
    "| num:",1+(daySeed(today,birthday,"num")%9),
    "| dir:",pick(LUCKY_DIRS,daySeed(today,birthday,"dir")),
    "| yi:",pick(YI_POOL,daySeed(today,birthday,"yi1"))+"/"+pick(YI_POOL,daySeed(today,birthday,"yi2")),
    "| ji:",pick(JI_POOL,daySeed(today,birthday,"ji1"))+"/"+pick(JI_POOL,daySeed(today,birthday,"ji2")),
    "| tip:",pick(TIPS,daySeed(today,birthday,"tip")),
    "| quote:",pick(QUOTES,daySeed(today,birthday,"quote")),
    "| manifest:",pick(MANIFEST,daySeed(today,birthday,"manifest")),
    "| tarot:",["past","now","future"].map(function(k){return pick(TAROT,daySeed(today,birthday,"tarot-"+k));}).join("/"));
});
