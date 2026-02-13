const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (!CRON_SECRET) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}

async function main() {
  const url = `${APP_URL}/api/cron/expire?secret=${encodeURIComponent(CRON_SECRET as string)}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error("Expire request failed:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log("Expired posts:", data.expired);
}

main();
