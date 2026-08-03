function hashStr(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}
var LUCKY_COLORS=["粉","白","浅蓝","薄荷绿","鹅黄","薰衣草紫","珊瑚橙","奶杏色"];
var LUCKY_DIRS=["东","南","西","北","东南","西南","西北","东北"];
var YI_POOL=["祈福许愿","学习新知","整理收纳","主动沟通","运动拉伸","创作表达","规划复盘","社交联结","独处充电","理财记账","早睡养神","记录灵感","表白心意","开启新计划"];
var JI_POOL=["冲动决策","过度消费","熬夜损耗","内耗纠结","拖延回避","与人争执","暴饮暴食","言多必失","苛责自己"];
var TIPS=["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"];
var QUOTES=["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11"];
var MANIFEST=["m1","m2","m3","m4","m5","m6"];
function pick(arr,seed){return arr[seed%arr.length];}
var birthday="2000-10-22";
["2026-08-03","2026-08-04","2026-08-05"].forEach(function(today){
  var seed=hashStr(birthday+today);
  var score=60+(seed%40);
  console.log("=== "+today+" seed="+seed+" ===");
  console.log("score:",score,
    "| color:",pick(LUCKY_COLORS,seed),
    "| num:",((seed>>2)%9+1),
    "| dir:",pick(LUCKY_DIRS,(seed>>3)),
    "| yi:",pick(YI_POOL,(seed>>4))+" "+pick(YI_POOL,(seed>>5)+3),
    "| ji:",pick(JI_POOL,(seed>>4)+1)+" "+pick(JI_POOL,(seed>>6)+4),
    "| tip:",pick(TIPS,seed>>2),
    "| quote:",pick(QUOTES,seed>>4),
    "| manifest:",pick(MANIFEST,seed>>5));
});
