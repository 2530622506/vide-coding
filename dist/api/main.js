import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module.js";
loadLocalEnv(".env");
loadLocalEnv(".env.prod");
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
function loadLocalEnv(filename) {
    const envPath = resolve(process.cwd(), filename);
    if (!existsSync(envPath)) {
        return;
    }
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) {
            continue;
        }
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1).trim());
        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
function unquoteEnvValue(value) {
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}
