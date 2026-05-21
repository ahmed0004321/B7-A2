
import app from "./app"
import { config } from "./config/env"
import { initDB } from "./DB"

const main = () => {
    initDB();
    app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}`)
})
}
main();