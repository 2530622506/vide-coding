import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: true });
    app.setGlobalPrefix("api");
    const port = Number(process.env.PORT || 3001);
    await app.listen(port);
    console.log(`GESP catalog API listening on http://localhost:${port}/api`);
}
bootstrap().catch((error) => {
    console.error("Failed to start GESP catalog API", error);
    process.exitCode = 1;
});
