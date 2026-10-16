import "reflect-metadata";
import { createApp } from "./create-app";
async function bootstrap() {
  const app = await createApp();
  await app.listen(
    Number(process.env.PORT || 3000),
    process.env.HOST || "127.0.0.1",
  );
}
void bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
