import {Server as HttpServer} from 'http'
import {Server,Socket} from 'socket.io'


class SocketService{
    private _io?:Server;

    public init(httpServer:HttpServer){
        this._io=new Server(httpServer,{
            cors:{
                origin:process.env.CLIENT_URL||"*",
                methods:['GET',"POST"]
            }
        })
    }

    public get io():Server{
        if(!this._io){
            throw new Error("socket has not been initialized")
        }

        return this._io
    }
}

export const socketService=new SocketService();