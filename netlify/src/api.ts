// Fungsi Netlify: membungkus Express app yang sama dengan server VPS.
// Di-bundle oleh script/build-netlify.ts → netlify/functions/api.js
import serverless from "serverless-http";
import { createApp } from "../../server/app";

type Handler = ReturnType<typeof serverless>;

// App dibuat sekali per instance (cold start), lalu dipakai ulang antar request.
let starting: Promise<Handler> | null = null;

export const handler = async (event: any, context: any) => {
  starting ??= createApp()
    .then(({ app }) => serverless(app))
    .catch((err) => {
      starting = null; // jangan "menyangkut" error cold start — coba lagi di request berikut
      throw err;
    });

  // Redirect /api/* → /.netlify/functions/api/:splat bisa membuat path berawalan
  // /.netlify/functions/api; Express memakai rute /api/..., jadi samakan.
  if (typeof event.path === "string") {
    event.path = event.path.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, "/api");
  }

  const handle = await starting;
  return handle(event, context);
};
