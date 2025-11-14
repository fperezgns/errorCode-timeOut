async function queryErrors({ analyticsApi, usersApi, routingApi }, { interval, errorCode }) {
  const body = {
    interval,
    paging: { pageSize: 100, pageNumber: 1 },
    segmentFilters: [{
      type: 'and',
      predicates: [
        { dimension: 'mediaType', value: 'voice' },
        { dimension: 'errorCode', value: errorCode }
      ]
    }],
    returnFields: [
      'conversationId', 'conversationStart', 'conversationEnd',
      'participantName', 'participantRole', 'userId', 'purpose',
      'errorCode', 'disconnectType', 'sessionAni', 'sessionDnis',
      'segmentStart', 'segmentEnd', 'mediaType', 'queueId', 'queueName'
    ],
    order: 'asc',
    orderBy: 'conversationStart'
  };

  const userCache = new Map();   // userId -> name
  const queueCache = new Map();  // queueId -> name
  const out = [];

  async function getAgentName(userId) {
    if (!userId) return null;
    if (userCache.has(userId)) return userCache.get(userId);
    try {
      const u = await usersApi.getUser(userId);
      const name = u?.name || u?.username || null;
      userCache.set(userId, name);
      return name;
    } catch {
      userCache.set(userId, null);
      return null;
    }
  }

  async function getQueueName(queueId) {
    if (!queueId) return null;
    if (queueCache.has(queueId)) return queueCache.get(queueId);
    try {
      const q = await routingApi.getRoutingQueue(queueId);
      const name = q?.name || null;
      queueCache.set(queueId, name);
      return name;
    } catch {
      queueCache.set(queueId, null);
      return null;
    }
  }

  let page = 1;
  while (true) {
    body.paging.pageNumber = page;
    // eslint-disable-next-line no-await-in-loop
    const resp = await analyticsApi.postAnalyticsConversationsDetailsQuery(body);
    const convs = resp?.conversations || [];
    if (!convs.length) break;

    // Procesar conversaciones
    // eslint-disable-next-line no-restricted-syntax
    for (const conv of convs) {
      const cid = conv?.conversationId;
      const cstart = conv?.conversationStart;
      const participants = conv?.participants || [];

      // ANI/DNIS a nivel de conversación
      let convAni = null;
      let convDnis = null;

      // eslint-disable-next-line no-restricted-syntax
      for (const pAni of participants) {
        const sessions = pAni?.sessions || [];
        // eslint-disable-next-line no-restricted-syntax
        for (const sAni of sessions) {
          if (!convAni) convAni = sAni?.ani || null;
          if (!convDnis) convDnis = sAni?.dnis || null;

          const segsAni = sAni?.segments || [];
          // eslint-disable-next-line no-restricted-syntax
          for (const segAni of segsAni) {
            const purposeSeg = (segAni?.purpose || '').toLowerCase();
            if (['customer','external','inbound','outbound'].includes(purposeSeg)) {
              if (!convAni) convAni = segAni?.ani || null;
              if (!convDnis) convDnis = segAni?.dnis || null;
            }
          }
          if (convAni && convDnis) break;
        }
        if (convAni && convDnis) break;
      }

      // Agentes
      const agentPairs = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const p of participants) {
        const role = (p?.participantRole || '').toLowerCase();
        const purpose = (p?.purpose || '').toLowerCase();
        if (role === 'agent' || purpose === 'agent') {
          const uid = p?.userId || null;
          // eslint-disable-next-line no-await-in-loop
          const name = p?.participantName || await getAgentName(uid);
          agentPairs.push([name || null, uid]);
        }
      }
      if (!agentPairs.length) agentPairs.push([null, null]);

      // Segs con el error
      // eslint-disable-next-line no-restricted-syntax
      for (const p of participants) {
        const sessions = p?.sessions || [];
        // eslint-disable-next-line no-restricted-syntax
        for (const s of sessions) {
          const segments = s?.segments || [];
          // eslint-disable-next-line no-restricted-syntax
          for (const seg of segments) {
            if (seg?.errorCode !== errorCode) continue;

            let qName = seg?.queueName || null;
            const qId = seg?.queueId || null;
            if (!qName) {
              // eslint-disable-next-line no-await-in-loop
              qName = await getQueueName(qId);
            }

            // una fila por cada agente
            // eslint-disable-next-line no-restricted-syntax
            for (const [agentName, agentUserId] of agentPairs) {
              out.push({
                conversationId: cid,
                conversationStart: cstart,
                agentName: agentName || '',
                agentUserId: agentUserId || '',
                queueId: qId || '',
                queueName: qName || '',
                ani: convAni || '',
                dnis: convDnis || '',
                disconnectType: seg?.disconnectType || '',
                errorCode: seg?.errorCode || ''
              });
            }
          }
        }
      }
    }

    const pageSize = resp?.paging?.pageSize ?? 100;
    if (convs.length < pageSize) break;
    page += 1;
  }

  // De-duplicar
  const seen = new Set();
  const unique = [];
  for (const r of out) {
    const key = [
      r.conversationId, r.conversationStart, r.agentUserId, r.agentName,
      r.queueId, r.queueName, r.ani, r.dnis, r.disconnectType, r.errorCode
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }

  return unique;
}

module.exports = { queryErrors };
