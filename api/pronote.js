// api/pronote.js (Vercel serverless CJS)
const pronote = require("pronote-api");

const pad = n => String(n).padStart(2, "0");
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hhmm   = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

module.exports = async (req, res) => {
  try {
    const { url, username, password, cas, from, to } =
      req.method === "POST" ? req.body : req.query;

    if (!url || !username || !password) {
      return res.status(400).json({ error: "Missing url/username/password" });
    }

    const options = {};
    if (cas && String(cas).trim()) options.cas = String(cas).trim(); // ex: "ac-paris"

    const session = await pronote.login(url, username, password, options);

    const start = from ? new Date(from) : new Date();
    const end   = to   ? new Date(to)   : new Date(start.getTime() + 6*86400000);

    // Emploi du temps
    const timetable = await session.timetable(start, end);
    const edt = timetable.map(ev => ({
      date: isoDate(ev.from),
      start: hhmm(ev.from),
      end: hhmm(ev.to),
      subject: ev.subject?.name || "",
      room: ev.room || "",
      cancelled: !!ev.isCancelled
    }));

    // Devoirs
    const hws = await session.homeworks(start, end);
    const homeworks = hws.map(h => ({
      date: isoDate(h.for),
      subject: h.subject?.name || "",
      content: h.description?.text || h.description || ""
    }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ edt, homeworks });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};
