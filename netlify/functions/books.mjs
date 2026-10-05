import { getDatabase } from "@netlify/database";

const STATUSES = ["want", "reading", "read"];
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// Validate and normalise user input on the server
function clean(b) {
  const title = String(b.title ?? "").trim().slice(0, 120);
  if (!title) return null;
  return {
    title,
    author: String(b.author ?? "").trim().slice(0, 80),
    notes: String(b.notes ?? "").trim().slice(0, 500),
    status: STATUSES.includes(b.status) ? b.status : "want",
    rating: Math.min(5, Math.max(0, parseInt(b.rating, 10) || 0)),
  };
}

export default async (req, context) => {
  const db = getDatabase();
  const rawId = context.params?.id;
  const id = rawId === undefined ? null : Number(rawId);
  if (rawId !== undefined && !Number.isInteger(id)) return json({ error: "Invalid id." }, 400);

  try {
    if (req.method === "GET" && id === null) {
      const rows = await db.sql`
        SELECT id, title, author, notes, status, rating FROM books ORDER BY id DESC`;
      return json(rows);
    }
    if (req.method === "POST" && id === null) {
      const d = clean(await req.json().catch(() => ({})));
      if (!d) return json({ error: "Title is required." }, 400);
      const [book] = await db.sql`
        INSERT INTO books (title, author, notes, status, rating)
        VALUES (${d.title}, ${d.author}, ${d.notes}, ${d.status}, ${d.rating})
        RETURNING id, title, author, notes, status, rating`;
      return json(book, 201);
    }
    if (req.method === "PUT" && id !== null) {
      const d = clean(await req.json().catch(() => ({})));
      if (!d) return json({ error: "Title is required." }, 400);
      const rows = await db.sql`
        UPDATE books
        SET title = ${d.title}, author = ${d.author}, notes = ${d.notes},
            status = ${d.status}, rating = ${d.rating}
        WHERE id = ${id}
        RETURNING id, title, author, notes, status, rating`;
      if (!rows.length) return json({ error: "Book not found." }, 404);
      return json(rows[0]);
    }
    if (req.method === "DELETE" && id !== null) {
      await db.sql`DELETE FROM books WHERE id = ${id}`;
      return new Response(null, { status: 204 });
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error. Try again." }, 500);
  }
};

export const config = { path: ["/api/books", "/api/books/:id"] };
