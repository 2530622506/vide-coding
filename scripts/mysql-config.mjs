export function mysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3310),
    database: process.env.MYSQL_DATABASE || "gesp_catalog",
    user: process.env.MYSQL_USER || "gesp",
    password: process.env.MYSQL_PASSWORD || "gesp_dev_password",
    charset: "utf8mb4"
  };
}
