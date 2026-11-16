import { json, parse, clean, isEmail } from "../../lib/common.js";

export async function onRequestPost({ request, env }) {
  const { data, error } = await parse(request, env);
  if (error) return error;

  const name = clean(data.name, 100);
  const email = clean(data.email, 254).toLowerCase();
  const message = clean(data.message, 2000);
  if (!name || !message) return json({ error: "Add your name and a message." }, 400);
  if (!isEmail(email)) return json({ error: "Enter a valid email address." }, 400);

  await env.DB.prepare(
    "INSERT INTO inquiries (name, email, firm, metro, topic, message) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(name, email, clean(data.firm, 150), clean(data.metro, 100), clean(data.topic, 100), message).run();

  return json({ ok: true });
}
