export const topics = [
 { id: 'self', name: '自我与意识', color: '#a4e1cc', center: [-7, 3.5, 1], words: ['自我','意识','主体','存在','身份','镜像','灵魂','拉康','真实','边界','自由','独处','认知','觉察','觉悟','觉醒','知天命','中庸','无为','大智若愚','顿悟','本质','视角','信仰','因果','意义','自尊','平庸','自律','信念','知行','内耗','完美主义','自洽','敏感','情绪','焦虑','选择','荒诞','哲学','空','道','禅'] },
 { id: 'desire', name: '欲望与关系', color: '#d4baa2', center: [1, 4, -4], words: ['欲望','关系','爱情','恋爱','他者','亲密','孤独','陪伴','失去','承认','凝视','情感','点赞','讨好','安全感','依恋','原生家庭','嫉妒','控制欲','配得感','空窗期','放下','断联','期待','爱'] },
 { id: 'time', name: '时间与记忆', color: '#a0c9db', center: [7, .2, 1], words: ['时间','记忆','过去','未来','回忆','怀旧','遗忘','童年','重复','历史','永恒','等待','当下','反刍','复盘','遗憾','沉没成本','断舍离','后悔'] },
 { id: 'poetry', name: '诗与夜晚', color: '#c4c9b8', center: [-1, -4, 2], words: ['诗','夜','月','梦','雨','风','花','星','黄昏','冬','夏','沉默','回声','影子','雨声','夜晚','月光','雨夜','夜色','诗歌','诗人','候鸟','圆缺','花开花落','间隙','木偶戏','虚无'] },
 { id: 'code', name: '代码与机器', color: '#83b8bd', center: [-7, -3, -6], words: ['代码','程序','算法','技术','模型','机器','系统','屏幕','像素','终端','计算','接口','数据','ai','osu','agent','rag','部署','github'] },
 { id: 'other', name: '未归类', color: '#b2b9b7', center: [7, -4, -6], words: [] },
];

export function classify(data, body, overrides = {}) {
 const weighted = [[data.title || '', 8], [(data.tags || []).join(' '), 6], [data.description || '', 3], [body, 1]];
 const scores = topics.filter(t => t.words.length).map(t => {
  const evidence = [];
  let score = 0;
  for (const word of t.words) {
   let n = 0;
   for (const [i,[text, weight]] of weighted.entries()) {
    // Single-character poetic words are useful in titles, but noisy in prose.
    if(word.length===1&&i>1)continue;
    n += Math.min(4, String(text).toLowerCase().split(word).length - 1) * weight;
   }
   if(String(data.title).replace(/[《》\s]/g,'').toLowerCase()===word)n+=24;
   if (n) { score += n; evidence.push(word); }
  }
  return { id: t.id, score, evidence };
 }).sort((a,b) => b.score - a.score);
 const [best, second] = scores;
 const override = overrides[data.id];
 if (override && !topics.some(t => t.id === override)) throw Error(`Unknown topic override: ${override}`);
 return { topic: override || (best.score >= 5 ? best.id : 'other'),
  confidence: override ? 'manual' : best.score < 5 ? 'fallback' : best.score - second.score < 8 ? 'low' : 'rule',
  evidence: best.evidence, crossTopics: scores.slice(1,3).filter(s => s.score >= best.score * .55 && s.score >= 5).map(s => s.id), scores };
}

// Position is a pure function of ID + primary topic, not index/order/count.
export function positionFor(id, topic) {
 const c = topics.find(t => t.id === topic).center;
 let n = 2166136261;
 for (const char of id) n = Math.imul(n ^ char.codePointAt(0), 16777619) >>> 0;
 const random = () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
 const angle = random() * Math.PI * 2, radius = .65 + Math.sqrt(random()) * 2.65;
 return [c[0] + Math.cos(angle) * radius, c[1] + Math.sin(angle) * radius * .65, c[2] + (random()-.5)*5];
}
