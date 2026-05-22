import type { UserPayload } from "../config/auth.config.ts";

declare global{
    namespace Express{
        interface Request{
            user?:UserPayload
        }
    }
}