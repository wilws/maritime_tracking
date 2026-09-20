'use client'

import { use, useEffect, useState } from "react"


type Props = {
  params: Promise<{
        number: string;
    }>;
}

export default  function SingleVesselPage({params}: Props){
    const {number} =  use(params)

    const [vesselHistory, setVesselHistory]= useState([])


    useEffect(()=>{
       async function getVessel(){
            try{
                const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/vessels/${number}`)
                const data = await response.json()
                setVesselHistory(data)

            }catch(error){
                console.log(error)
            }
       }
       getVessel()

    },[number, setVesselHistory])

    return (
        <>
        <h1> Thih is page {number}</h1>
        <div>
        
        {vesselHistory.map((v,i)=> <p key={i}> {JSON.stringify(v)}</p>)}
        </div>
        </>

    )
}