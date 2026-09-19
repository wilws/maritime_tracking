
'use client'
import { useEffect, useState } from "react";

    
    

export default function Page(){


    const [isConnected, setIsConnected] = useState<boolean>(false)

    useEffect(() => {

        let ws: WebSocket;
        let timer: ReturnType<typeof setTimeout>
        let closed = false

        const connect = () =>{

            ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!)
            ws.onopen =() => {setIsConnected(true)}
            ws.onmessage=(m) => {console.log(JSON.parse(m.data))}
            ws.onclose=() => {
                setIsConnected(false)
                if (!closed) {
                    timer = setTimeout(connect,2000)
                }
            }

        }

        connect()


        return () => {
            closed = true
            clearTimeout(timer);
            ws?.close()
        }


    },[])


  

    
    
    return (
        <div>
         <h1>Maritime Tracking Testing Page</h1>
         {
            isConnected ? (<p>Websocket is connected</p>):(<p>WebSocket is NOT connected</p>)


         }
        </div>
    )
}